import React, { useState, useEffect, useRef } from 'react';
import * as d3 from 'd3';
import Calendar from './calendar/CalendarComponent';

// Utility function to get saved data from localStorage
const getSavedData = () => {
    const savedData = localStorage.getItem('sarcasticFinanceAppCouple');
    if (savedData) {
        try {
            return JSON.parse(savedData);
        } catch (error) {
            console.error("Erro ao carregar dados do localStorage, iniciando com dados vazios:", error);
            localStorage.removeItem('sarcasticFinanceAppCouple'); // Clear corrupted data
        }
    }
    return {
        coupleNames: { partner1: "Pessoa 1", partner2: "Pessoa 2" },
        balance: 0,
        transactions: [],
        goals: [],
        budgets: [], // New state for budgets
        rouletteOptions: ["Pizza", "Comida Caseira", "Delivery Econômico", "Miojo Gourmet", "Sobras da Geladeira", "Jantar Chique (só na imaginação)"],
        journalEntries: [] // New state for journal
    };
};

// --- Currency Input Mask Component ---
// This component handles the R$ formatting in the input fields.
// It stores the raw numeric value (e.g., "12345" for R$ 123,45) and displays the formatted value.
const CurrencyInput = ({ value, onChange, placeholder = "0,00" }) => {
  const formatValue = (val) => {
    // retira tudo que não for dígito
    const numeric = val.replace(/\D/g, '') || '0';
    const number = parseInt(numeric, 10);

    // separa reais e centavos
    const cents = number % 100;
    const reais = Math.floor(number / 100);

    // formata reais no padrão pt-BR (sem zeros à esquerda)
    const formattedReais = reais.toLocaleString('pt-BR');

    return `R$ ${formattedReais},${cents.toString().padStart(2, '0')}`;
  };

  const handleChange = e => {
    onChange(e.target.value.replace(/\D/g, ''));
  };

  return (
    <input
      type="text"
      className="w-full p-3 rounded-md bg-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 border border-gray-500"
      placeholder={`R$ ${placeholder}`}
      value={formatValue(value)}
      onChange={handleChange}
      inputMode="numeric"
      required
    />
  );
};



// Main App component
const App = () => {
    // Global states
    const [currentPage, setCurrentPage] = useState('dashboard');
    const [coupleNames, setCoupleNames] = useState(getSavedData().coupleNames);
    const [transactions, setTransactions] = useState(getSavedData().transactions);
    const [balance, setBalance] = useState(getSavedData().balance);
    const [goals, setGoals] = useState(getSavedData().goals);
    const [budgets, setBudgets] = useState(getSavedData().budgets);
    const [rouletteOptions, setRouletteOptions] = useState(getSavedData().rouletteOptions);
    const [journalEntries, setJournalEntries] = useState(getSavedData().journalEntries);
    const [message, setMessage] = useState(''); // For custom alert messages
    const [isLoggedIn, setIsLoggedIn] = useState(false); // Login status
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false); // Mobile sidebar state

    // Load initial data from localStorage on component mount
    useEffect(() => {
        const { coupleNames, transactions, balance, goals, budgets, rouletteOptions, journalEntries } = getSavedData();
        setCoupleNames(coupleNames);
        setTransactions(transactions);
        setBalance(balance);
        setGoals(goals);
        setBudgets(budgets);
        setRouletteOptions(rouletteOptions);
        setJournalEntries(journalEntries);
        // In a real app, you might check for a token here to auto-login
    }, []);

    // Save all data to localStorage whenever states change
    useEffect(() => {
        localStorage.setItem('sarcasticFinanceAppCouple', JSON.stringify({ coupleNames, transactions, balance, goals, budgets, rouletteOptions, journalEntries }));
    }, [coupleNames, transactions, balance, goals, budgets, rouletteOptions, journalEntries]);

    // Add Tailwind CSS and Inter font to the document head for consistent styling
    useEffect(() => {
        const tailwindScript = document.createElement('script');
        tailwindScript.src = "https://cdn.tailwindcss.com";
        document.head.appendChild(tailwindScript);

        const interLink = document.createElement('link');
        interLink.href = "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;800&display=swap";
        interLink.rel = "stylesheet";
        document.head.appendChild(interLink);

        const interStyle = document.createElement('style');
        interStyle.innerHTML = `body { font-family: 'Inter', sans-serif; }`;
        document.head.appendChild(interStyle);

        return () => {
            document.head.removeChild(tailwindScript);
            document.head.removeChild(interLink);
            document.head.removeChild(interStyle);
        };
    }, []);

    // Function to add a new financial transaction (income or expense)
    const addTransaction = (description, rawAmount, type, responsiblePartner, category = 'Outros') => {
        const amount = parseFloat(rawAmount) / 100; // Convert raw digits from CurrencyInput to actual currency value
        if (!description.trim() || isNaN(amount) || amount <= 0) {
            setMessage("Ops! Parece que você esqueceu de preencher algo ou tentou um valor inválido. A burocracia é chata, mas necessária.");
            return;
        }
        if (!responsiblePartner) {
            setMessage("Quem foi o culpado (ou o herói)? Selecione um dos parceiros!");
            return;
        }

        const newTransaction = {
            id: crypto.randomUUID(),
            description,
            amount: type === 'expense' ? -Math.abs(amount) : Math.abs(amount), // Ensure expense is negative
            type,
            date: new Date().toISOString(),
            responsiblePartner,
            category
        };
        setTransactions(prevTransactions => [...prevTransactions, newTransaction]);
        setBalance(prevBalance => prevBalance + newTransaction.amount);
        setMessage(type === 'expense' ? `Despesa de R$ ${amount.toFixed(2).replace('.', ',')} registrada. A culpa é do(a) ${responsiblePartner}!` : `Receita de R$ ${amount.toFixed(2).replace('.', ',')} registrada. Parabéns, ${responsiblePartner}!`);
        setTimeout(() => setMessage(''), 3000); // Clear message after 3 seconds
    };

    // Function to delete an existing transaction
    const deleteTransaction = (id, amount) => {
        setTransactions(prevTransactions => prevTransactions.filter(t => t.id !== id));
        setBalance(prevBalance => prevBalance - amount); // Revert the balance change
        setMessage("Lembrança dolorosa (ou alegre) apagada com sucesso!");
        setTimeout(() => setMessage(''), 3000);
    };

    // Function to add or update a financial goal
    const addOrUpdateGoal = (newGoal) => {
        setGoals(prevGoals => {
            const existingGoalIndex = prevGoals.findIndex(g => g.id === newGoal.id);
            if (existingGoalIndex > -1) {
                // Update existing goal
                const updatedGoals = [...prevGoals];
                updatedGoals[existingGoalIndex] = newGoal;
                return updatedGoals;
            } else {
                // Add new goal
                return [...prevGoals, { ...newGoal, id: crypto.randomUUID(), dateCreated: new Date().toISOString() }];
            }
        });
        setMessage("Meta atualizada! Rumo ao sofrimento (ou à alegria) conjunto!");
        setTimeout(() => setMessage(''), 3000);
    };

    // Function to delete a financial goal
    const deleteGoal = (id) => {
        setGoals(prevGoals => prevGoals.filter(g => g.id !== id));
        setMessage("Meta abandonada. Sabíamos que era ambicioso demais!");
        setTimeout(() => setMessage(''), 3000);
    };

    // Function to contribute money towards a financial goal
    const contributeToGoal = (goalId, rawAmount) => {
        const amount = parseFloat(rawAmount) / 100; // Convert raw digits to actual currency
        if (amount <= 0 || isNaN(amount)) {
            setMessage("Valor inválido para contribuição. Tente de novo, com fé.");
            return;
        }
        if (balance < amount) {
            setMessage("Saldo insuficiente! A realidade é dura, né?");
            return;
        }

        setGoals(prevGoals => prevGoals.map(goal => {
            if (goal.id === goalId) {
                const newCurrentAmount = goal.currentAmount + amount;
                return { ...goal, currentAmount: newCurrentAmount > goal.targetAmount ? goal.targetAmount : newCurrentAmount };
            }
            return goal;
        }));
        setBalance(prevBalance => prevBalance - amount);
        setMessage(`R$ ${amount.toFixed(2).replace('.', ',')} contribuídos para a meta! O futuro sorri (ou chora) para vocês!`);
        setTimeout(() => setMessage(''), 3000);
    };

    // Functions for managing budgets by category
    const addOrUpdateBudget = (newBudget) => {
        setBudgets(prevBudgets => {
            const existingBudgetIndex = prevBudgets.findIndex(b => b.category === newBudget.category);
            if (existingBudgetIndex > -1) {
                const updatedBudgets = [...prevBudgets];
                updatedBudgets[existingBudgetIndex] = newBudget;
                return updatedBudgets;
            } else {
                return [...prevBudgets, newBudget];
            }
        });
        setMessage(`Orçamento para "${newBudget.category}" atualizado! Cuidado para não estourar.`);
        setTimeout(() => setMessage(''), 3000);
    };

    // Function to delete a budget category
    const deleteBudget = (category) => {
        setBudgets(prevBudgets => prevBudgets.filter(b => b.category !== category));
        setMessage(`Orçamento para "${category}" removido. Vão gastar sem limites agora, né?`);
        setTimeout(() => setMessage(''), 3000);
    };

    // Functions for managing journal entries
    const addJournalEntry = (entryText, entryMood) => {
        setJournalEntries(prevEntries => [...prevEntries, { id: crypto.randomUUID(), text: entryText, mood: entryMood, date: new Date().toISOString() }]);
        setMessage("Pensamentos sombrios (ou nem tanto) registrados!");
        setTimeout(() => setMessage(''), 3000);
    };

    // Function to delete a journal entry
    const deleteJournalEntry = (id) => {
        setJournalEntries(prevEntries => prevEntries.filter(entry => entry.id !== id));
        setMessage("Lembrança apagada. Melhor assim!");
        setTimeout(() => setMessage(''), 3000);
    };


    // Main App Content component (rendered after successful login)
    const MainAppContent = () => {
        // Renders the current page based on the `currentPage` state
        const renderPage = () => {
            switch (currentPage) {
              case 'dashboard':
                return (
                  <Dashboard
                    balance={balance}
                    transactions={transactions}
                  budgets={budgets}
                    addTransaction={addTransaction}
                    deleteTransaction={deleteTransaction}
                    coupleNames={coupleNames}
                    setMessage={setMessage}
                  />
                );
              
                case 'goals':
                    return (
                        <GoalsTab
                            goals={goals}
                            addOrUpdateGoal={addOrUpdateGoal}
                            deleteGoal={deleteGoal}
                            contributeToGoal={contributeToGoal}
                            balance={balance}
                            setMessage={setMessage}
                        />
                    );
                case 'budgets':
                    return (
                        <BudgetingTab
                            budgets={budgets}
                            addOrUpdateBudget={addOrUpdateBudget}
                            deleteBudget={deleteBudget}
                            transactions={transactions}
                            setMessage={setMessage}
                        />
                    );
                case 'roulette':
                    return (
                        <RouletteTab
                            rouletteOptions={rouletteOptions}
                            setRouletteOptions={setRouletteOptions}
                            setMessage={setMessage}
                        />
                    );
                case 'journal':
                    return (
                        <GratitudeJournalTab
                            journalEntries={journalEntries}
                            addJournalEntry={addJournalEntry}
                            deleteJournalEntry={deleteJournalEntry}
                            setMessage={setMessage}
                        />
                    );
                case 'summary':
                    return (
                        <CoupleSummaryTab
                            transactions={transactions}
                            coupleNames={coupleNames}
                            setCoupleNames={setCoupleNames}
                            setMessage={setMessage}
                        />
                    );
                    case 'calendar':
                      return <Calendar />;
                default:
                    return (
                        <Dashboard
                            balance={balance}
                            transactions={transactions}
                            addTransaction={addTransaction}
                            deleteTransaction={deleteTransaction}
                            coupleNames={coupleNames}
                            setMessage={setMessage}
                        />
                    );
            }
        };

        return (
            // Main content area: shifts right on medium screens and up for sidebar
            // On smaller screens, it occupies full width
            <div className="flex-1 md:ml-[300px] p-6 sm:p-10 flex flex-col items-center overflow-auto">
                {/* Header with Logout button and Hamburger menu toggle for mobile */}
                <Header onMenuToggle={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)} />

                {/* Custom Message Display for user feedback */}
                {message && (
                    <div className="bg-yellow-800 text-yellow-100 p-4 rounded-md shadow-md mb-6 w-full max-w-5xl text-center animate-bounce-in">
                        {message}
                    </div>
                )}

                {/* Main content container with consistent styling */}
                <div className="max-w-5xl w-full bg-gray-800 rounded-xl shadow-2xl p-6 sm:p-10 border border-gray-700">
                    {renderPage()}
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 to-indigo-900 text-white flex">
            {/* Meta viewport for responsive behavior */}
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />

            {/* Custom CSS for message animation */}
            <style>
                {`
                @keyframes bounce-in {
                    0% {
                        transform: scale(0.5);
                        opacity: 0;
                    }
                    70% {
                        transform: scale(1.05);
                        opacity: 1;
                    }
                    100% {
                        transform: scale(1);
                    }
                }
                .animate-bounce-in {
                    animation: bounce-in 0.3s ease-out;
                }
                `}
            </style>

            {isLoggedIn ? (
                <>
                    {/* Sidebar (fixed on desktop, mobile overlay) */}
                    <Sidebar
                        currentPage={currentPage}
                        setCurrentPage={setCurrentPage}
                        coupleNames={coupleNames}
                        isMobileSidebarOpen={isMobileSidebarOpen}
                        setIsMobileSidebarOpen={setIsMobileSidebarOpen}
                        onLogout={() => setIsLoggedIn(false)} // Pass logout to sidebar
                    />
                    {/* Main Application Content */}
                    <MainAppContent />
                </>
            ) : (
                // Login screen if not logged in
                <LoginScreen setIsLoggedIn={setIsLoggedIn} setCoupleNames={setCoupleNames} setMessage={setMessage} />
            )}
        </div>
    );
};

// --- Sub-Components ---

// Login Screen Component: Handles user authentication (mocked)
const LoginScreen = ({ setIsLoggedIn, setCoupleNames, setMessage }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    // Mock Users for demonstration purposes
    const mockUsers = {
        "edubia": { password: "Banana123@", partner1: "A Rainha do mimimei", partner2: "Chefe da Fatura Surpresa" },
        "test": { password: "test", partner1: "Humano 1", partner2: "Humano 2" }
    };

    // Handles the login form submission
    const handleLogin = (e) => {
        e.preventDefault();
        setError(''); // Clear previous errors
        if (mockUsers[username] && mockUsers[username].password === password) {
            setIsLoggedIn(true); // Set logged in state
            setCoupleNames({ partner1: mockUsers[username].partner1, partner2: mockUsers[username].partner2 }); // Set couple names
            setMessage("Login bem-sucedido! Preparem-se para a realidade financeira!");
        } else {
            setError("Credenciais inválidas. Vocês erraram a senha, igual erram as contas!");
            setMessage("Erro no login. Tente novamente.");
        }
        setTimeout(() => setMessage(''), 3000); // Clear message after 3 seconds
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 to-indigo-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 flex-1">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <h2 className="mt-6 text-center text-4xl font-extrabold text-white animate-bounce-in">
                    🔑 Acessem o Abismo Financeiro Conjunto 🔑
                </h2>
                <p className="mt-2 text-center text-sm text-gray-400">
                    Não se preocupem, ninguém vai julgar... A não ser o sistema.
                </p>
            </div>

            {/* Login Form */}
            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-gray-800 py-8 px-4 shadow-xl sm:rounded-lg sm:px-10 border border-gray-700">
                    <form className="space-y-6" onSubmit={handleLogin}>
                        <div>
                            <label htmlFor="username" className="block text-sm font-medium text-gray-300">
                                Nome de Usuário (para fins de investigação futura)
                            </label>
                            <div className="mt-1">
                                <input
                                    id="username"
                                    name="username"
                                    type="text"
                                    autoComplete="username"
                                    required
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="appearance-none block w-full px-3 py-2 border border-gray-600 rounded-md shadow-sm placeholder-gray-500 bg-gray-700 text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-300">
                            Senha (a única coisa que você precisa lembrar… por favor)
                            </label>
                            <div className="mt-1">
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    autoComplete="current-password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="appearance-none block w-full px-3 py-2 border border-gray-600 rounded-md shadow-sm placeholder-gray-500 bg-gray-700 text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="text-red-400 text-sm mt-2 text-center">
                                {error}
                            </div>
                        )}

                        <div>
                            <button
                                type="submit"
                                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-lg font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition duration-150 ease-in-out transform hover:scale-105"
                            >
                                Entrar no Pesadelo Financeiro
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

// Sidebar Component: Navigation menu for the application
const Sidebar = ({ currentPage, setCurrentPage, coupleNames, isMobileSidebarOpen, setIsMobileSidebarOpen, onLogout }) => {
    // Navigation items configuration
    const navItems = [
        { id: 'dashboard', label: 'Dashboard do Apocalipse', icon: '💀' },
        { id: 'calendar', label: 'Memória de Peixe', icon: '📅' },
        { id: 'goals', label: 'Metas de Sofrimento Conjunto', icon: '🎯' },
        { id: 'budgets', label: 'O Grande Orçamento da Ilusão', icon: '💸' },
        { id: 'roulette', label: 'Roleta do Destino Gastronômico', icon: '🎰' },
        { id: 'journal', label: 'Diário de Humor Financeiro', icon: '✍️' },
        { id: 'summary', label: 'Canto do Divórcio Amigável', icon: '💔' },
    ];

    return (
        <>
            {/* Desktop Sidebar (visible on medium screens and up) */}
            <div className="hidden md:flex md:w-[305px] bg-gray-900 p-6 flex-col h-screen shadow-lg border-r border-gray-700 fixed top-0 left-0 overflow-y-auto z-10">
                <div className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600 mb-8 text-center">
                💰 DuoDindin 💰
                </div>
                <nav className="flex-1">
                    <ul className="space-y-4">
                        {navItems.map(item => (
                            <li key={item.id}>
                                <button
                                    onClick={() => setCurrentPage(item.id)}
                                    className={`w-full text-left px-4 py-3 rounded-lg flex items-center space-x-3 transition duration-200 ease-in-out ${
                                        currentPage === item.id
                                            ? 'bg-indigo-700 text-white shadow-md'
                                            : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                                    }`}
                                >
                                    <span className="text-xl">{item.icon}</span>
                                    <span className="font-medium">{item.label}</span>
                                </button>
                            </li>
                        ))}
                    </ul>
                </nav>
                {/* Couple names display at the bottom of the sidebar */}
                <div className="mt-8 pt-4 border-t border-gray-700 text-gray-500 text-sm text-center">
                    <p>Gerido por:</p>
                    <p className="font-bold text-gray-400">{coupleNames.partner1}</p>
                    <p className="font-bold text-gray-400">e</p>
                    <p className="font-bold text-gray-400">{coupleNames.partner2}</p>
                </div>
                {/* Logout Button in Sidebar */}
                <button
                    onClick={onLogout}
                    className="mt-4 w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition duration-150 ease-in-out shadow-md"
                    title="Sair do abismo financeiro por um tempo"
                >
                    Sair
                </button>
            </div>

            {/* Mobile Sidebar Overlay (visible on small screens when open) */}
            {isMobileSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-75 z-20 md:hidden"
                    onClick={() => setIsMobileSidebarOpen(false)} // Close when clicking outside
                ></div>
            )}

            {/* Mobile Sidebar (slides in from left) */}
            <div className={`fixed top-0 left-0 h-full w-[250px] bg-gray-900 p-6 flex flex-col shadow-lg border-r border-gray-700 z-30 md:hidden
                transform ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 ease-in-out`}>
                <div className="flex justify-between items-center mb-8">
                    <div className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600 text-center">
                        📊 Casal Sarcástico
                    </div>
                    <button
                        onClick={() => setIsMobileSidebarOpen(false)}
                        className="text-gray-400 hover:text-white p-2 rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                <nav className="flex-1">
                    <ul className="space-y-4">
                        {navItems.map(item => (
                            <li key={item.id}>
                                <button
                                    onClick={() => { setCurrentPage(item.id); setIsMobileSidebarOpen(false); }}
                                    className={`w-full text-left px-4 py-3 rounded-lg flex items-center space-x-3 transition duration-200 ease-in-out ${
                                        currentPage === item.id
                                            ? 'bg-indigo-700 text-white shadow-md'
                                            : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                                    }`}
                                >
                                    <span className="text-xl">{item.icon}</span>
                                    <span className="font-medium">{item.label}</span>
                                </button>
                            </li>
                        ))}
                    </ul>
                </nav>
                <div className="mt-8 pt-4 border-t border-gray-700 text-gray-500 text-sm text-center">
                    <p>Gerido por:</p>
                    <p className="font-bold text-gray-400">{coupleNames.partner1}</p>
                    <p className="font-bold text-gray-400">e</p>
                    <p className="font-bold text-gray-400">{coupleNames.partner2}</p>
                </div>
                 {/* Logout Button in Mobile Sidebar */}
                <button
                    onClick={onLogout}
                    className="mt-4 w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition duration-150 ease-in-out shadow-md"
                    title="Sair do abismo financeiro por um tempo"
                >
                    Sair
                </button>
            </div>
        </>
    );
};

// Header Component: Displays app title, slogan, and logout button. Also includes mobile menu toggle.
const Header = ({ onLogout, onMenuToggle }) => {
    return (
        <div className="text-center mb-10 w-full flex justify-between items-center relative">
            {/* Hamburger menu icon for mobile */}
            <button  onClick={onMenuToggle}
            className="md:hidden text-gray-300 hover:text-white p-2 rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 absolute top-2 right-[-4px] z-40"
                >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none"
                  viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round"
                      d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            {/* Main Title and Slogan */}
            <div className="flex-grow text-center">
              <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600 mb-2 sm:mb-4 animate-pulse">
                💰 DuoDindin 💰
              </h1>
              <p className="text-md sm:text-xl text-gray-400">
                Finanças de casal: equilibrando orçamento e DRs com uma pitada de sarcasmo
              </p>
              <p className="text-xs sm:text-sm text-gray-500 mt-2">
                Esconda suas economias (e seu bom humor) no console do navegador — o único cofre sem discussão.
              </p>
            </div>

            {/* Logout Button (removed from here, now in Sidebar) */}
        </div>
    );
};


// Dashboard Component: Main landing page with overview of finances
const Dashboard = ({
  balance,
  transactions,
  budgets,
  addTransaction,
  deleteTransaction,
  coupleNames,
  setMessage
}) => {
  const totalRevenue = transactions
    .filter(t => t.type === 'revenue')
    .reduce((acc, t) => acc + t.amount, 0);
  const totalExpense = transactions
    .filter(t => t.type === 'expense')
    .reduce((acc, t) => acc + Math.abs(t.amount), 0);
  const sumRemaining = budgets.reduce((acc, b) => {
      const spent = transactions
        .filter(t => t.category === b.category && t.type === 'expense')
        .reduce((s, t) => s + Math.abs(t.amount), 0);
      return acc + (b.limit - spent);
    }, 0);

  return (
    <div className="flex flex-col space-y-4 w-full px-2 sm:px-4 md:px-0">
      {/* SALDO */}
      <div className="bg-gray-700 rounded-lg p-4 sm:p-6 shadow text-center">
        <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-300 mb-1">
          Saldo Conjunto
        </h2>
        <p className={`text-2xl sm:text-3xl md:text-5xl font-extrabold ${
          balance >= 0 ? 'text-green-400' : 'text-red-400'
        }`}>
          R$ {balance.toFixed(2).replace('.', ',')}
        </p>
      </div>

     

      {/* ORÇAMENTOS */}
      <div className="bg-gray-700 rounded-xl p-4 shadow-lg border border-gray-600">
        {/* Cabeçalho com total orçado */}
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-gray-100">Orçamentos</h3>
          <span className="text-sm font-medium text-gray-300">
          Total Restante: R$ {sumRemaining.toFixed(2).replace('.', ',')}
          </span>
        </div>

        {/* Grid de categorias */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {budgets.map(b => {
            const spent = transactions
              .filter(t => t.category === b.category && t.type === 'expense')
              .reduce((sum, t) => sum + Math.abs(t.amount), 0);
            const remaining = b.limit - spent;
            const percent = Math.min((spent / b.limit) * 100, 100);

            // Função para marcar como pago
            const handlePago = () => {
              const rawAmount = (b.limit * 100).toString();
              addTransaction(
                `Pagamento: ${b.category}`,
                rawAmount,
                'expense',
                coupleNames.partner1,
                b.category
              );
            };

            return (
              <div key={b.category} className="bg-gray-800 p-3 rounded-lg flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-200">{b.category}</span>
                    <span className={`text-sm font-bold ${
                      remaining < 0 ? 'text-red-400' : 'text-green-400'
                    }`}>
                      R$ {remaining.toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                  <div className="w-full bg-gray-600 h-2 rounded-full overflow-hidden">
                    <div
                      className={`${remaining < 0 ? 'bg-red-500' : 'bg-green-500'} h-full`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-400">{percent.toFixed(0)}% usado</p>
                </div>
                <button
                  onClick={handlePago}
                  className="mt-3 self-end bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-3 py-1 rounded-md transition"
                >
                  Pago
                </button>
              </div>
            );
          })}
        </div>
      </div>

            {/* FORMULÁRIO DE TRANSAÇÕES */}
            <div className="bg-gray-700 rounded-lg p-3 sm:p-4 shadow">
        <TransactionForm
          addTransaction={addTransaction}
          coupleNames={coupleNames}
          setMessage={setMessage}
        />
      </div>

       {/* DICA SARCASTICA */}
       <div className="bg-gray-700 rounded-lg p-3 sm:p-4 shadow">
        <SarcasticAdvice balance={balance} transactions={transactions} />
      </div>

      {/* GRÁFICOS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gray-700 rounded-lg p-3 sm:p-4 shadow">
          <FinanceChart totalRevenue={totalRevenue} totalExpense={totalExpense} />
        </div>
        <div className="bg-gray-700 rounded-lg p-3 sm:p-4 shadow">
          <CategoryExpenseChart transactions={transactions} />
        </div>
      </div>


      {/* LISTA DE TRANSAÇÕES */}
      <div className="bg-gray-700 rounded-lg p-3 sm:p-4 shadow">
        <TransactionList
          transactions={transactions}
          deleteTransaction={deleteTransaction}
        />
      </div>
    </div>
  );
};



// Balance Display Component: Shows current financial balance and a humorous status
const BalanceDisplay = ({ balance }) => {
    let povertyStatus = '';
    let statusColor = '';
    let statusEmoji = '';

    // Determine humorous status based on balance
    if (balance > 10000) {
        povertyStatus = "Ricos em Espírito (e com uma bela poupança para a terapia de casal)";
        statusColor = "text-green-400";
        statusEmoji = "�";
    } else if (balance > 2000) {
        povertyStatus = "Sobrevivendo (ainda dá pra pagar o jantar, mas a gorjeta é opcional)";
        statusColor = "text-yellow-400";
        statusEmoji = "😌";
    } else if (balance > 0) {
        povertyStatus = "No Limite (um café a mais pode ser o fim do mundo)";
        statusColor = "text-orange-400";
        statusEmoji = "😬";
    } else {
        povertyStatus = "Pobres e Endividados (mas pelo menos têm um ao outro para culpar)";
        statusColor = "text-red-400";
        statusEmoji = "😭";
    }

    return (
        <div className="bg-gray-700 rounded-lg p-6 shadow-lg text-center border border-gray-600">
            <h2 className="text-2xl font-bold text-gray-300 mb-2">
                Sua Fortuna Conjunta (ou a ilusão dela)
            </h2>
            <p className={`text-5xl font-extrabold ${balance >= 0 ? 'text-green-500' : 'text-red-500'} mb-4`}>
                R$ {balance.toFixed(2).replace('.', ',')}
            </p>
            <p className={`text-xl font-medium ${statusColor}`}>
                Medidor de Pobreza Interior: {statusEmoji} {povertyStatus}
            </p>
            <p className="text-sm text-gray-500 mt-4">
                Lembrem-se: o dinheiro é apenas uma métrica para o seu sofrimento compartilhado.
            </p>
        </div>
    );
};

// Sarcastic Advice Component: Provides humorous financial advice based on balance
const SarcasticAdvice = ({ balance, transactions }) => {
    const totalExpense = transactions
        .filter(t => t.type === 'expense')
        .reduce((acc, t) => acc + Math.abs(t.amount), 0);

    let advice = "";
    let emoji = "🤔";

    // Dynamic advice based on current balance
    if (balance < 0) {
        advice = "Parabéns, vocês estão oficialmente no vermelho! Que tal um banho gelado para economizar na conta de luz? Ou talvez comecem a vender seus órgãos... brincadeira (ou não)!";
        emoji = "💸";
    } else if (balance === 0) {
        advice = "Uau, saldo zero! Vocês são mestres em viver no limite. Próximo passo: tentar viver do ar.";
        emoji = "💨";
    } else if (balance > 0 && balance < 500) {
        advice = "Dinheiro é bom, mas o de vocês está voando baixo. Melhor economizar nas cervejas e investir em miçangas.";
        emoji = "🤏";
    } else if (balance >= 500 && balance < 2000) {
        advice = "Saldo razoável! Mas não se empolguem, o próximo boleto é sempre o pior. Guardem para a terapia de casal.";
        emoji = "😌";
    } else if (balance >= 2000 && balance < 5000) {
        advice = "Estão indo bem! Já podem sonhar com um fim de semana fora... no sítio da sogra.";
        emoji = "🛣️";
    } else if (balance >= 5000 && balance < 10000) {
        advice = "Quase lá! Com essa quantia, vocês podem até pagar a faculdade dos seus futuros gatos.";
        emoji = "🐈";
    } else if (balance >= 10000) {
        advice = "Ricos! Ou pelo menos menos pobres que a maioria. Que tal doar para os necessitados... tipo, para vocês mesmos no futuro?";
        emoji = "🤑";
    }

    // Additional advice based on top spending category (if any)
    if (totalExpense > 0) {
        const topCategory = transactions
            .filter(t => t.type === 'expense' && t.category)
            .reduce((acc, t) => {
                acc[t.category] = (acc[t.category] || 0) + Math.abs(t.amount);
                return acc;
            }, {});

        const sortedCategories = Object.entries(topCategory).sort(([, a], [, b]) => b - a);
        if (sortedCategories.length > 0) {
            const [catName, catAmount] = sortedCategories[0];
            if (catName === 'Entretenimento' && catAmount > 500) {
                advice += " E parece que o entretenimento é o seu maior vício. Vão falir rindo!";
            } else if (catName === 'Vícios' && catAmount > 300) {
                advice += " E os vícios, hein? Talvez um grupo de apoio, ou uma conta no banco.";
            } else if (catName === 'Capricho Inútil' && catAmount > 200) {
                advice += " Tantos 'caprichos inúteis'... a conta bancária implora por piedade!";
            }
        }
    }

    return (
        <div className="bg-gray-700 rounded-lg p-6 shadow-lg border border-gray-600">
            <h2 className="text-2xl font-bold text-gray-300 mb-4 text-center flex items-center justify-center">
                💡 Dicas de Sobrevivência Financeira {emoji}
            </h2>
            <p className="text-gray-400 text-center text-lg italic">
                "{advice}"
            </p>
            <p className="text-sm text-gray-500 mt-4 text-center">
                (Não nos responsabilizamos por decisões financeiras baseadas nestes conselhos.)
            </p>
        </div>
    );
};


// Transaction Form Component: Allows users to add new financial transactions
const TransactionForm = ({ addTransaction, coupleNames, setMessage }) => {
    const [description, setDescription] = useState('');
    const [rawAmount, setRawAmount] = useState(''); // Stores raw digits for CurrencyInput
    const [type, setType] = useState('expense'); // Default to expense
    const [responsiblePartner, setResponsiblePartner] = useState('');
    // Predefined categories for transactions
    const expenseCategories = [
      "Alimentação",
      "Moradia",
      "Transporte",
      "Entretenimento",
      "Saúde",
      "Educação",
      "Outros",
      "Capricho Inútil",
      "Vícios"
    ];
    const incomeCategories = [
      "Salário",
      "Freelance",
      "Investimentos",
      "Presente",
      "Outros"
    ];
    
    const [selectedCategory, setSelectedCategory] = useState('Outros');


    useEffect(() => {
        // Set default responsible partner if not already set and couple names are available
        if (!responsiblePartner && coupleNames.partner1) {
            setResponsiblePartner(coupleNames.partner1);
        }
    }, [coupleNames, responsiblePartner]);

    // Handles the form submission for adding a new transaction
    const handleSubmit = (e) => {
        e.preventDefault();
        addTransaction(description, rawAmount, type, responsiblePartner, selectedCategory);
        setDescription('');
        setRawAmount(''); // Reset raw amount after submission
        // Message handled by addTransaction function in parent
    };

    return (
      <div className="bg-gray-700 rounded-lg p-6 shadow-lg border border-gray-600">
        <h2 className="text-2xl font-bold text-gray-300 mb-4 text-center">
          Registrar a Próxima Desgraça (ou Milagre) Financeira
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Descrição */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-400 mb-1">
              Onde seu dinheiro foi morrer / De onde a grana milagrosamente apareceu?
            </label>
            <input
              type="text"
              id="description"
              className="w-full p-3 rounded-md bg-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 border border-gray-500"
              placeholder="Ex: Terapia de casal, Pizza que ninguém queria, Salário de escravo moderno"
              value={description}
              onChange={e => setDescription(e.target.value)}
              required
            />
          </div>
    
          {/* Valor */}
          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-gray-400 mb-1">
              O Valor (em R$, e seja honesto, por favor)
            </label>
            <CurrencyInput
              value={rawAmount}
              onChange={setRawAmount}
              placeholder="0,00"
            />
          </div>
    
          {/* Tipo */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
            <label className="flex items-center text-gray-400">
              <input
                type="radio"
                name="type"
                value="expense"
                checked={type === 'expense'}
                onChange={() => setType('expense')}
                className="form-radio h-5 w-5 text-red-500 border-gray-500 focus:ring-red-500"
              />
              <span className="ml-2">Despesa de Arrombar 💸</span>
            </label>
            <label className="flex items-center text-gray-400">
              <input
                type="radio"
                name="type"
                value="revenue"
                checked={type === 'revenue'}
                onChange={() => setType('revenue')}
                className="form-radio h-5 w-5 text-green-500 border-gray-500 focus:ring-green-500"
              />
              <span className="ml-2">Receita Mirabolante ✨</span>
            </label>
          </div>
    
          {/* Categoria Dinâmica */}
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-400 mb-1">
              Categoria da {type === 'expense' ? 'Despesa' : 'Receita'}
            </label>
            <select
              id="category"
              className="w-full p-3 rounded-md bg-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 border border-gray-500"
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              required
            >
              <option value="" disabled>Selecione uma categoria</option>
              {(type === 'expense' ? expenseCategories : incomeCategories).map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
    
          {/* Parceiro Responsável */}
          <div>
            <label htmlFor="responsiblePartner" className="block text-sm font-medium text-gray-400 mb-1">
              Quem foi o Culpado (ou o Salvador)?
            </label>
            <select
              id="responsiblePartner"
              className="w-full p-3 rounded-md bg-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 border border-gray-500"
              value={responsiblePartner}
              onChange={e => setResponsiblePartner(e.target.value)}
              required
            >
              <option value="" disabled>Selecione um parceiro</option>
              <option value={coupleNames.partner1}>{coupleNames.partner1}</option>
              <option value={coupleNames.partner2}>{coupleNames.partner2}</option>
            </select>
          </div>
    
          {/* Botão de Envio */}
          <button
            type="submit"
            className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold py-3 px-6 rounded-lg shadow-xl transform transition duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-800"
          >
            {type === 'expense' ? 'Desembolsar Mais Tristezas' : 'Receber uma Esmola Divina'}
          </button>
        </form>
      </div>
    );
  }    

// Transaction List Component: Displays a list of all recorded transactions
const TransactionList = ({ transactions, deleteTransaction }) => {
    return (
        <div className="bg-gray-700 rounded-lg p-6 shadow-lg border border-gray-600 mt-8">
            <h2 className="text-2xl font-bold text-gray-300 mb-4 text-center">
                Histórico de Desgraças e Milagres
            </h2>
            {transactions.length === 0 ? (
                <p className="text-gray-400 text-center py-4">
                    Seu histórico está tão vazio quanto sua carteira às vezes. Adicionem algo!
                </p>
            ) : (
                <ul className="space-y-3">
                    {transactions.map(transaction => (
                        <li
                            key={transaction.id}
                            className={`flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 rounded-md shadow-sm ${transaction.type === 'expense' ? 'bg-red-900 bg-opacity-30 border-l-4 border-red-500' : 'bg-green-900 bg-opacity-30 border-l-4 border-green-500'}`}
                        >
                            <div className="flex-grow">
                                <p className="text-lg font-medium text-white">{transaction.description}</p>
                                <p className="text-sm text-gray-400">
                                    {new Date(transaction.date).toLocaleDateString('pt-BR')} - <span className="font-semibold">{transaction.responsiblePartner}</span>
                                    {/* Display category if available */}
                                    {transaction.category && <span className="ml-2 px-2 py-0.5 bg-gray-600 rounded-full text-xs text-gray-300">({transaction.category})</span>}
                                </p>
                            </div>
                            <div className="flex items-center space-x-4 mt-2 sm:mt-0">
                                <span className={`text-lg font-bold ${transaction.type === 'expense' ? 'text-red-400' : 'text-green-400'}`}>
                                    R$ {transaction.amount.toFixed(2).replace('.', ',')}
                                </span>
                                {/* Delete button for transaction */}
                                <button
                                    onClick={() => deleteTransaction(transaction.id, transaction.amount)}
                                    className="p-2 text-gray-400 hover:text-red-400 rounded-full hover:bg-gray-600 transition duration-150 ease-in-out"
                                    title="Deletar essa lembrança dolorosa (ou alegre)"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

// Finance Chart Component: Displays a bar chart of total revenue vs. total expense
const FinanceChart = ({ totalRevenue, totalExpense }) => {
    const svgRef = useRef();

    useEffect(() => {
        const svg = d3.select(svgRef.current);
        const containerWidth = svg.node().clientWidth; // Get actual container width
        const width = Math.min(containerWidth - 40, 300); // Max width 300, min 40px padding
        const height = 200;
        const margin = { top: 20, right: 20, bottom: 30, left: 40 };

        svg.selectAll("*").remove(); // Clear previous chart elements

        // Append a group element to apply margins and translate
        const g = svg.attr("width", "100%") // Make SVG responsive to container width
                     .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`) // Set viewBox for scaling
                     .append("g")
                     .attr("transform", `translate(${margin.left},${margin.top})`); // Apply translation for margins


        const data = [
            { name: "Receitas", value: totalRevenue, color: "#4ade80" }, // Green for revenue
            { name: "Despesas", value: totalExpense, color: "#ef4444" }    // Red for expense
        ];

        // X-axis scale for categories (band scale)
        const x = d3.scaleBand()
            .range([0, width])
            .padding(0.1)
            .domain(data.map(d => d.name));

        // Y-axis scale for values (linear scale)
        const y = d3.scaleLinear()
            .range([height, 0])
            .domain([0, d3.max(data, d => d.value) * 1.1]); // Domain with 10% padding above max value

        // Add X axis to the chart
        g.append("g")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(x))
            .selectAll("text")
            .attr("class", "text-gray-400 text-sm"); // Apply Tailwind classes for styling

        // Add Y axis to the chart
        g.append("g")
            .call(d3.axisLeft(y).ticks(5).tickFormat(d => `R$ ${d}`)) // Format Y-axis ticks as currency
            .selectAll("text")
            .attr("class", "text-gray-400 text-sm"); // Apply Tailwind classes for styling

        // Add bars to the chart
        g.selectAll(".bar")
            .data(data)
            .enter().append("rect")
            .attr("class", "bar")
            .attr("x", d => x(d.name))
            .attr("y", d => y(d.value))
            .attr("width", x.bandwidth())
            .attr("height", d => height - y(d.value))
            .attr("fill", d => d.color)
            .attr("rx", 5) // Rounded corners for bars
            .attr("ry", 5);

        // Add values on top of the bars
        g.selectAll(".bar-value")
            .data(data)
            .enter().append("text")
            .attr("class", "bar-value text-white text-xs font-bold") // Apply Tailwind classes for styling
            .attr("x", d => x(d.name) + x.bandwidth() / 2) // Center text above the bar
            .attr("y", d => y(d.value) - 5) // Position text slightly above the bar
            .attr("text-anchor", "middle") // Center text horizontally
            .text(d => `R$ ${d.value.toFixed(2).replace('.', ',')}`); // Display formatted value

    }, [totalRevenue, totalExpense]); // Redraw chart when total revenue or expense changes

    return (
        <div className="bg-gray-700 rounded-lg p-6 shadow-lg text-center border border-gray-600">
            <h2 className="text-2xl font-bold text-gray-300 mb-4">
                Gráfico da Realidade Nua e Crua do Casal
            </h2>
            <svg ref={svgRef} className="w-full h-auto max-h-64"></svg> {/* Responsive SVG container */}
            <p className="text-sm text-gray-500 mt-4">
                Sim, vocês podem ver a dor conjunta em forma de barras.
            </p>
        </div>
    );
};

// Category Expense Pie Chart Component: Visualizes spending distribution by category
const CategoryExpenseChart = ({ transactions }) => {
    const svgRef = useRef();

    useEffect(() => {
        // Aggregate expense data by category
        const expenseData = transactions
            .filter(t => t.type === 'expense' && t.category)
            .reduce((acc, t) => {
                acc[t.category] = (acc[t.category] || 0) + Math.abs(t.amount);
                return acc;
            }, {});

        // Convert aggregated data to array of objects for D3 pie chart
        const data = Object.entries(expenseData).map(([category, amount]) => ({ category, amount }));

        // If no expense data or total amount is zero, clear the SVG and return
        if (data.length === 0 || d3.sum(data, d => d.amount) === 0) {
            d3.select(svgRef.current).selectAll("*").remove();
            return;
        }

        const width = 300;
        const height = 300;
        const radius = Math.min(width, height) / 2; // Radius of the pie chart

        const svg = d3.select(svgRef.current);
        svg.selectAll("*").remove(); // Clear previous chart elements

        // Append a group element to center the pie chart
        const g = svg.attr("width", "100%") // Make SVG responsive to container width
                     .attr("viewBox", `0 0 ${width} ${height}`) // Set viewBox for scaling
                     .append("g")
                     .attr("transform", `translate(${width / 2},${height / 2})`); // Center the group

        // Color scale for pie slices
        const color = d3.scaleOrdinal(d3.schemeCategory10);

        // D3 pie generator: converts data into arc-friendly angles
        const pie = d3.pie()
            .value(d => d.amount)
            .sort(null); // No sorting, order as in data array

        // D3 arc generator: creates the path data for pie slices
        const arc = d3.arc()
            .innerRadius(0) // Solid pie chart
            .outerRadius(radius);

        // Create the pie slices
        const arcs = g.selectAll(".arc")
            .data(pie(data))
            .enter().append("g")
            .attr("class", "arc");

        // Append path for each slice
        arcs.append("path")
            .attr("d", arc)
            .attr("fill", d => color(d.data.category)) // Fill with color based on category
            .attr("stroke", "#374151") // Dark border for separation
            .style("stroke-width", "1px");

        // Add text labels to each slice (category and percentage)
        arcs.append("text")
            .attr("transform", d => `translate(${arc.centroid(d)})`) // Position text at the centroid of the arc
            .attr("text-anchor", "middle") // Center text horizontally
            .attr("fill", "white")
            .attr("font-size", "10px")
            .text(d => `${d.data.category} (${(d.data.amount / d3.sum(data, d => d.amount) * 100).toFixed(1)}%)`);

    }, [transactions]); // Redraw chart when transactions change

    return (
        <div className="bg-gray-700 rounded-lg p-6 shadow-lg text-center border border-gray-600">
            <h2 className="text-2xl font-bold text-gray-300 mb-4">
                📊 Mapa da Desgraça por Categoria
            </h2>
            {transactions.filter(t => t.type === 'expense').length === 0 ? (
                <p className="text-gray-400">Nenhuma despesa registrada para análise. Vão gastar algo!</p>
            ) : (
                <svg ref={svgRef} className="w-full h-auto max-h-80 mx-auto"></svg>
            )}
            <p className="text-sm text-gray-500 mt-4">
                Descubram visualmente onde seu dinheiro está *realmente* escorrendo.
            </p>
        </div>
    );
};


// Goals Tab Component: Manages financial goals for the couple
const GoalsTab = ({ goals, addOrUpdateGoal, deleteGoal, contributeToGoal, balance, setMessage }) => {
    const [goalName, setGoalName] = useState('');
    const [rawGoalTarget, setRawGoalTarget] = useState(''); // Raw digits for CurrencyInput
    const [editingGoalId, setEditingGoalId] = useState(null); // To manage editing state

    // Handles the form submission for adding/updating a goal
    const handleGoalSubmit = (e) => {
        e.preventDefault();
        const goalTarget = parseFloat(rawGoalTarget) / 100; // Convert raw digits to actual currency
        if (!goalName.trim() || isNaN(goalTarget) || goalTarget <= 0) {
            setMessage("Meta inválida! Sonhem alto, mas com números reais.");
            return;
        }

        const newGoal = {
            id: editingGoalId || crypto.randomUUID(), // Use existing ID if editing, new one if adding
            name: goalName,
            targetAmount: goalTarget,
            currentAmount: editingGoalId ? goals.find(g => g.id === editingGoalId).currentAmount : 0, // Preserve current amount when editing
        };
        addOrUpdateGoal(newGoal);
        setGoalName('');
        setRawGoalTarget(''); // Reset raw amount after submission
        setEditingGoalId(null); // Exit editing mode
    };

    // Sets the form fields for editing an existing goal
    const handleEditGoal = (goal) => {
        setGoalName(goal.name);
        setRawGoalTarget((goal.targetAmount * 100).toString()); // Convert target amount to raw digits for input
        setEditingGoalId(goal.id);
        setMessage("Editando meta. Preparem-se para mais sonhos (ou pesadelos) financeiros.");
    };

    return (
        <div className="bg-gray-800 rounded-lg p-6 shadow-2xl border border-gray-700">
            <h2 className="text-3xl font-extrabold text-gray-200 mb-6 text-center">
                🎯 Metas de Sofrimento Conjunto 🎯
            </h2>
            <p className="text-gray-400 mb-8 text-center">
                Aqui é onde vocês definem os próximos objetivos que (talvez) nunca serão alcançados.
            </p>

            {/* Form for adding/editing goals */}
            <form onSubmit={handleGoalSubmit} className="space-y-4 bg-gray-700 p-6 rounded-lg shadow-md mb-8 border border-gray-600">
                <h3 className="text-xl font-bold text-gray-300 mb-3 text-center">
                    {editingGoalId ? 'Atualizar Meta Existente' : 'Criar Nova Meta (e novas frustrações)'}
                </h3>
                <div>
                    <label htmlFor="goalName" className="block text-sm font-medium text-gray-400 mb-1">
                        Nome da Meta (seja criativo, a dor será a mesma)
                    </label>
                    <input
                        type="text"
                        id="goalName"
                        className="w-full p-3 rounded-md bg-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500 border border-gray-500"
                        placeholder="Ex: Férias para o Acre, Comprar um sofá para chorar, Quitar a dívida do cartão"
                        value={goalName}
                        onChange={(e) => setGoalName(e.target.value)}
                        required
                    />
                </div>
                <div>
                    <label htmlFor="goalTarget" className="block text-sm font-medium text-gray-400 mb-1">
                        Valor Alvo (a quantia que vocês precisam para se enganar)
                    </label>
                    {/* CurrencyInput for goal target */}
                    <CurrencyInput
                        value={rawGoalTarget}
                        onChange={setRawGoalTarget}
                        placeholder="0,00"
                    />
                </div>
                {/* Action buttons for form */}
                <button
                    type="submit"
                    className="w-full bg-gradient-to-r from-pink-600 to-red-600 hover:from-pink-700 hover:to-red-700 text-white font-bold py-3 px-6 rounded-lg shadow-xl transform transition duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 focus:ring-offset-gray-800"
                >
                    {editingGoalId ? 'Atualizar Meta' : 'Adicionar Nova Meta de Sofrimento'}
                </button>
                {/* Cancel button if in editing mode */}
                {editingGoalId && (
                    <button
                        type="button"
                        onClick={() => {
                            setGoalName('');
                            setRawGoalTarget('');
                            setEditingGoalId(null);
                            setMessage("Cancelado! A procrastinação venceu de novo.");
                        }}
                        className="w-full mt-2 bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg transition duration-200"
                    >
                        Cancelar Edição
                    </button>
                )}
            </form>

            {/* List of current goals */}
            <h3 className="text-2xl font-bold text-gray-300 mb-4 text-center">
                Suas Metas Atuais (Boa Sorte!)
            </h3>
            {goals.length === 0 ? (
                <p className="text-gray-400 text-center py-4">
                    Nenhuma meta definida. Sinal que vocês estão vivendo o dia, sem pensar no amanhã... ou no divórcio.
                </p>
            ) : (
                <ul className="space-y-4">
                    {goals.map(goal => (
                        <GoalItem
                            key={goal.id}
                            goal={goal}
                            onEdit={handleEditGoal}
                            onDelete={deleteGoal}
                            onContribute={contributeToGoal}
                            currentBalance={balance}
                            setMessage={setMessage}
                        />
                    ))}
                </ul>
            )}
        </div>
    );
};

// Goal Item Component: Displays an individual financial goal and its progress
const GoalItem = ({ goal, onEdit, onDelete, onContribute, currentBalance, setMessage }) => {
    const progress = (goal.currentAmount / goal.targetAmount) * 100; // Calculate progress percentage
    const [rawContributionAmount, setRawContributionAmount] = useState(''); // Raw digits for CurrencyInput

    // Handles contribution form submission
    const handleContributionSubmit = (e) => {
        e.preventDefault();
        onContribute(goal.id, rawContributionAmount); // Pass raw amount to parent
        setRawContributionAmount(''); // Reset input
    };

    return (
        <li className="bg-gray-700 rounded-lg p-6 shadow-md border border-gray-600">
            <div className="flex justify-between items-start mb-3">
                <div>
                    <h4 className="text-xl font-bold text-white mb-1">{goal.name}</h4>
                    <p className="text-sm text-gray-400">
                        Alvo: R$ {goal.targetAmount.toFixed(2).replace('.', ',')}
                    </p>
                    <p className="text-lg font-semibold text-gray-200">
                        Acumulado: R$ {goal.currentAmount.toFixed(2).replace('.', ',')}
                    </p>
                </div>
                {/* Action buttons for editing and deleting goal */}
                <div className="flex space-x-2">
                    <button
                        onClick={() => onEdit(goal)}
                        className="p-2 text-blue-400 hover:text-blue-200 rounded-full hover:bg-gray-600 transition duration-150"
                        title="Editar essa meta (e talvez a sua sanidade)"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                    </button>
                    <button
                        onClick={() => onDelete(goal.id)}
                        className="p-2 text-red-400 hover:text-red-200 rounded-full hover:bg-gray-600 transition duration-150"
                        title="Abandonar essa meta (e a esperança)"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Progress bar for the goal */}
            <div className="w-full bg-gray-600 rounded-full h-2.5 mb-3">
                <div
                    className="bg-green-500 h-2.5 rounded-full"
                    style={{ width: `${progress > 100 ? 100 : progress}%` }}
                ></div>
            </div>
            <p className="text-sm text-gray-300 mb-4 text-center">
                Progresso: {progress.toFixed(1)}% ({progress >= 100 ? 'Meta Alcançada! Agora, novas metas de sofrimento!' : 'Ainda longe da glória (ou da dor completa).'})
            </p>

            {/* Form to contribute to the goal */}
            <form onSubmit={handleContributionSubmit} className="flex space-x-2">
                {/* CurrencyInput for contribution amount */}
                <CurrencyInput
                    value={rawContributionAmount}
                    onChange={setRawContributionAmount}
                    placeholder="0,00"
                />
                <button
                  type="submit"
                  disabled={ parseFloat(rawContributionAmount) <= 0 || progress >= 100 }
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"

                >
                    Contribuir
                </button>
            </form>
        </li>
    );
};


// Couple Summary Tab Component: Provides a financial summary for each partner
const CoupleSummaryTab = ({ transactions, coupleNames, setCoupleNames, setMessage }) => {
    // Local states for partner names (can be edited)
    const [partner1Name, setPartner1Name] = useState(coupleNames.partner1);
    const [partner2Name, setPartner2Name] = useState(coupleNames.partner2);

    // Update local states when coupleNames from parent prop change
    useEffect(() => {
        setPartner1Name(coupleNames.partner1);
        setPartner2Name(coupleNames.partner2);
    }, [coupleNames]);

    // Handles saving updated partner names
    const handleNameChange = () => {
        if (!partner1Name.trim() || !partner2Name.trim()) {
            setMessage("Os nomes dos parceiros não podem ser vazios, nem na hora da briga!");
            return;
        }
        setCoupleNames({ partner1: partner1Name, partner2: partner2Name }); // Update parent state
        setMessage("Nomes dos parceiros atualizados! Agora podem se culpar com mais propriedade.");
        setTimeout(() => setMessage(''), 3000);
    };

    // Filter transactions by each partner
    const partner1Transactions = transactions.filter(t => t.responsiblePartner === coupleNames.partner1);
    const partner2Transactions = transactions.filter(t => t.responsiblePartner === coupleNames.partner2);

    // Calculate total expenses for each partner
    const partner1TotalExpense = partner1Transactions
        .filter(t => t.type === 'expense')
        .reduce((acc, t) => acc + Math.abs(t.amount), 0);

    const partner2TotalExpense = partner2Transactions
        .filter(t => t.type === 'expense')
        .reduce((acc, t) => acc + Math.abs(t.amount), 0);

    // Calculate total revenue for each partner
    const partner1TotalRevenue = partner1Transactions
        .filter(t => t.type === 'revenue')
        .reduce((acc, t) => acc + t.amount, 0);

    const partner2TotalRevenue = partner2Transactions
        .filter(t => t.type === 'revenue')
        .reduce((acc, t) => acc + t.amount, 0);

    // Determine humorous comparison message
    let comparisonMessage = '';
    let comparisonColor = 'text-gray-400';

    if (partner1TotalExpense > partner2TotalExpense) {
        comparisonMessage = `${coupleNames.partner1} está gastando mais (ou é só impressão? 🤔)`;
        comparisonColor = 'text-red-400';
    } else if (partner2TotalExpense > partner1TotalExpense) {
        comparisonMessage = `${coupleNames.partner2} está gastando mais (alguém precisa cortar os gastos com café!)`;
        comparisonColor = 'text-red-400';
    } else if (partner1TotalExpense > 0 && partner1TotalExpense === partner2TotalExpense) {
        comparisonMessage = "Que sincronia! Ambos gastando igualmente. Isso é assustador.";
        comparisonColor = 'text-yellow-400';
    } else {
        comparisonMessage = "Ainda sem dados para o ringue. Comecem a gastar!";
    }

    return (
        <div className="bg-gray-800 rounded-lg p-6 shadow-2xl border border-gray-700">
            <h2 className="text-3xl font-extrabold text-gray-200 mb-6 text-center">
                💔 Canto do Divórcio Amigável 💔
            </h2>
            <p className="text-gray-400 mb-8 text-center">
                Aqui vocês podem ver quem está realmente contribuindo para a felicidade... ou para a ruína financeira.
            </p>

            {/* Name Customization Section */}
            <div className="bg-gray-700 p-6 rounded-lg shadow-md mb-8 border border-gray-600">
                <h3 className="text-xl font-bold text-gray-300 mb-4 text-center">
                    Personalizem seus Nomes de Batalha
                </h3>
                <div className="space-y-4 mb-4">
                    <div>
                        <label htmlFor="partner1Name" className="block text-sm font-medium text-gray-400 mb-1">
                            Nome do Doido(a) 1:
                        </label>
                        <input
                            type="text"
                            id="partner1Name"
                            className="w-full p-3 rounded-md bg-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 border border-gray-500"
                            value={partner1Name}
                            onChange={(e) => setPartner1Name(e.target.value)}
                            placeholder="Ex: A Rainha dos Boletos"
                        />
                    </div>
                    <div>
                        <label htmlFor="partner2Name" className="block text-sm font-medium text-gray-400 mb-1">
                            Nome do Doido(a) 2:
                        </label>
                        <input
                            type="text"
                            id="partner2Name"
                            className="w-full p-3 rounded-md bg-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 border border-gray-500"
                            value={partner2Name}
                            onChange={(e) => setPartner2Name(e.target.value)}
                            placeholder="Ex: O Rei da Procrastinação"
                        />
                    </div>
                </div>
                {/* Button to save name changes */}
                <button
                    onClick={handleNameChange}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-lg shadow-xl transform transition duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-800"
                >
                    Salvar Nomes (e a discórdia)
                </button>
            </div>

            {/* Individual Summaries Section */}
            <h3 className="text-2xl font-bold text-gray-300 mb-4 text-center">
                Sua Parte nesse Abismo Financeiro
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Partner Summary components for each partner */}
                <PartnerSummary
                    partnerName={coupleNames.partner1}
                    totalRevenue={partner1TotalRevenue}
                    totalExpense={partner1TotalExpense}
                    type="partner1"
                />
                <PartnerSummary
                    partnerName={coupleNames.partner2}
                    totalRevenue={partner2TotalRevenue}
                    totalExpense={partner2TotalExpense}
                    type="partner2"
                />
            </div>
            {/* Humorous comparison message */}
            <p className={`text-center text-lg font-bold mt-8 ${comparisonColor}`}>
                {comparisonMessage}
            </p>
        </div>
    );
};

// Partner Summary Component: Displays revenue, expense, and net contribution for a single partner
const PartnerSummary = ({ partnerName, totalRevenue, totalExpense, type }) => {
    return (
        <div className={`rounded-lg p-6 shadow-lg border ${type === 'partner1' ? 'bg-purple-900 bg-opacity-20 border-purple-600' : 'bg-red-900 bg-opacity-20 border-red-600'}`}>
            <h4 className="text-xl font-bold text-white mb-4 text-center">{partnerName}</h4>
            <div className="space-y-3">
                <div className="flex justify-between items-center bg-gray-700 p-3 rounded-md shadow-sm">
                    <span className="text-gray-400 font-medium">Receitas:</span>
                    <span className="text-green-400 font-bold">R$ {totalRevenue.toFixed(2).replace('.', ',')}</span>
                </div>
                <div className="flex justify-between items-center bg-gray-700 p-3 rounded-md shadow-sm">
                    <span className="text-gray-400 font-medium">Despesas:</span>
                    <span className="text-red-400 font-bold">R$ {totalExpense.toFixed(2).replace('.', ',')}</span>
                </div>
                <div className="flex justify-between items-center bg-gray-700 p-3 rounded-md shadow-sm border-t border-gray-600 mt-4">
                    <span className="text-gray-300 font-medium">Contribuição Líquida:</span>
                    <span className={`font-bold ${ (totalRevenue - totalExpense) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        R$ {(totalRevenue - totalExpense).toFixed(2).replace('.', ',')}
                    </span>
                </div>
            </div>
        </div>
    );
};

// Roulette Tab Component: A fun tool to randomly select a dinner option
const RouletteTab = ({ rouletteOptions, setRouletteOptions, setMessage }) => {
    const [newOption, setNewOption] = useState('');
    const [selectedOption, setSelectedOption] = useState('');
    const [isSpinning, setIsSpinning] = useState(false);

    // Handles adding a new dinner option to the roulette
    const handleAddOption = (e) => {
        e.preventDefault();
        if (newOption.trim() && !rouletteOptions.includes(newOption.trim())) {
            setRouletteOptions(prevOptions => [...prevOptions, newOption.trim()]);
            setNewOption('');
            setMessage(`"${newOption.trim()}" adicionado à roleta. Mais uma opção para se arrepender!`);
            setTimeout(() => setMessage(''), 3000);
        } else if (rouletteOptions.includes(newOption.trim())) {
            setMessage("Opção já existe, tentem ser mais criativos... ou menos repetitivos na comida.");
            setTimeout(() => setMessage(''), 3000);
        } else {
            setMessage("Adicione algo para girar, a roleta não adivinha seus desejos ocultos.");
            setTimeout(() => setMessage(''), 3000);
        }
    };

    // Handles deleting a dinner option from the roulette
    const handleDeleteOption = (optionToDelete) => {
        setRouletteOptions(prevOptions => prevOptions.filter(option => option !== optionToDelete));
        setMessage(`"${optionToDelete}" removido. Menos uma decisão para brigar!`);
        setTimeout(() => setMessage(''), 3000);
    };

    // Handles spinning the roulette to select a random option
    const handleSpinRoulette = () => {
        if (rouletteOptions.length === 0) {
            setMessage("Adicionem opções, a roleta não funciona com o vazio existencial de vocês!");
            setTimeout(() => setMessage(''), 3000);
            return;
        }
        setIsSpinning(true);
        setSelectedOption(''); // Clear previous selection for spin effect

        const spinDuration = 3000; // 3 seconds spin duration
        const interval = 100; // Interval for updating displayed option
        let spinCount = 0;

        const spinEffect = setInterval(() => {
            const randomIndex = Math.floor(Math.random() * rouletteOptions.length);
            setSelectedOption(rouletteOptions[randomIndex]); // Update displayed option rapidly
            spinCount += interval;
            if (spinCount >= spinDuration) {
                clearInterval(spinEffect); // Stop spinning
                setIsSpinning(false);
                const finalSelection = rouletteOptions[randomIndex];
                setSelectedOption(finalSelection); // Set final selected option
                setMessage(`O destino decidiu: **${finalSelection}**! Preparem-se para... o que vier.`);
                setTimeout(() => setMessage(''), 5000); // Keep result message longer
            }
        }, interval);
    };

    return (
        <div className="bg-gray-800 rounded-lg p-6 shadow-2xl border border-gray-700">
            <h2 className="text-3xl font-extrabold text-gray-200 mb-6 text-center">
                🎰 Roleta do Destino Gastronômico 🎰
            </h2>
            <p className="text-gray-400 mb-8 text-center">
                Cansados de decidir o que comer? Deixem o destino (e o sistema) fazer isso por vocês! Assim ninguém culpa ninguém (diretamente).
            </p>

            {/* Form to add new roulette options */}
            <form onSubmit={handleAddOption} className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-2 mb-6 bg-gray-700 p-4 rounded-lg shadow-md border border-gray-600">
                <input
                    type="text"
                    className="flex-grow px-3 py-2 rounded-md bg-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 border border-gray-500"
                    placeholder="Adicione uma opção (ex: Pizza, Sushi, Cozinhar em casa)"
                    value={newOption}
                    onChange={(e) => setNewOption(e.target.value)}
                    required
                />
                <button
                    type="submit"
                    className="px-5 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition duration-150 ease-in-out transform hover:scale-105"
                >
                    Adicionar Opção
                </button>
            </form>

            {/* List of current roulette options */}
            <div className="bg-gray-700 p-6 rounded-lg shadow-md mb-8 border border-gray-600">
                <h3 className="text-xl font-bold text-gray-300 mb-4 text-center">Opções na Roleta:</h3>
                {rouletteOptions.length === 0 ? (
                    <p className="text-gray-400 text-center">Nenhuma opção adicionada. A roleta da vida está vazia, assim como sua barriga!</p>
                ) : (
                    <ul className="space-y-3">
                        {rouletteOptions.map((option, index) => (
                            <li key={index} className="flex justify-between items-center bg-gray-600 p-3 rounded-md shadow-sm">
                                <span className="text-lg text-white">{option}</span>
                                <button
                                    onClick={() => handleDeleteOption(option)}
                                    className="p-1 text-red-400 hover:text-red-200 rounded-full hover:bg-gray-500 transition duration-150"
                                    title="Remover essa opção (e a possibilidade de felicidade)"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {/* Spin button and result display */}
            <div className="text-center">
                <button
                    onClick={handleSpinRoulette}
                    disabled={isSpinning || rouletteOptions.length === 0}
                    className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 px-8 rounded-full shadow-lg text-2xl animate-pulse disabled:opacity-50 disabled:cursor-not-allowed transition duration-150 ease-in-out transform hover:scale-105"
                >
                    {isSpinning ? 'Girando o Destino...' : 'Girar Roleta!'}
                </button>
                {selectedOption && !isSpinning && (
                    <p className="mt-8 text-3xl font-extrabold text-pink-400 animate-bounce-in">
                        🎉 O Resultado é: {selectedOption}! 🎉
                    </p>
                )}
                {isSpinning && (
                    <p className="mt-8 text-3xl font-extrabold text-yellow-400">
                        🤔 Pensando... (ou rindo da sua indecisão) 🤔
                    </p>
                )}
            </div>
        </div>
    );
};

// Budgeting Tab Component: Allows couples to set and track monthly budgets by category
const BudgetingTab = ({ budgets, addOrUpdateBudget, deleteBudget, transactions, setMessage }) => {
    const [category, setCategory] = useState('');
    const [rawMonthlyLimit, setRawMonthlyLimit] = useState(''); // Raw digits for CurrencyInput

    // Predefined categories for budgeting
    const categories = ["Alimentação", "Moradia", "Transporte", "Entretenimento", "Saúde", "Educação", "Outros", "Capricho Inútil", "Vícios"];

    // Handles the form submission for setting/updating a budget
    const handleBudgetSubmit = (e) => {
        e.preventDefault();
        const monthlyLimit = parseFloat(rawMonthlyLimit) / 100; // Convert raw digits to actual currency
        if (!category.trim() || isNaN(monthlyLimit) || monthlyLimit <= 0) {
            setMessage("Orçamento inválido! Não me venha com números de fantasia.");
            return;
        }
        addOrUpdateBudget({ category, limit: monthlyLimit });
        setCategory('');
        setRawMonthlyLimit(''); // Reset raw amount
    };

    // Calculates the amount spent in a given category for the current month
    const getSpentAmount = (cat) => {
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        return transactions
            .filter(t => {
                const transactionDate = new Date(t.date);
                return t.category === cat && t.type === 'expense' &&
                       transactionDate.getMonth() === currentMonth &&
                       transactionDate.getFullYear() === currentYear;
            })
            .reduce((acc, t) => acc + Math.abs(t.amount), 0);
    };

    return (
        <div className="bg-gray-800 rounded-lg p-6 shadow-2xl border border-gray-700">
            <h2 className="text-3xl font-extrabold text-gray-200 mb-6 text-center">
                ✨ O Grande Orçamento da Ilusão ✨
            </h2>
            <p className="text-gray-400 mb-8 text-center">
                Aqui vocês podem planejar gastos, e depois se surpreender (ou não) com a realidade.
            </p>

            {/* Form for defining budget categories and limits */}
            <form onSubmit={handleBudgetSubmit} className="space-y-4 bg-gray-700 p-6 rounded-lg shadow-md mb-8 border border-gray-600">
                <h3 className="text-xl font-bold text-gray-300 mb-3 text-center">Definir Orçamento por Categoria</h3>
                <div>
                    <label htmlFor="budgetCategory" className="block text-sm font-medium text-gray-400 mb-1">
                        Categoria
                    </label>
                    <select
                        id="budgetCategory"
                        className="w-full p-3 rounded-md bg-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-pink-500 border border-gray-500"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        required
                    >
                        <option value="" disabled>Selecione uma categoria</option>
                        {categories.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label htmlFor="monthlyLimit" className="block text-sm font-medium text-gray-400 mb-1">
                        Limite Mensal (R$)
                    </label>
                    {/* CurrencyInput for monthly limit */}
                    <CurrencyInput
                        value={rawMonthlyLimit}
                        onChange={setRawMonthlyLimit}
                        placeholder="0,00"
                    />
                </div>
                <button
                    type="submit"
                    className="w-full bg-gradient-to-r from-pink-600 to-red-600 hover:from-pink-700 hover:to-red-700 text-white font-bold py-3 px-6 rounded-lg shadow-xl transform transition duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 focus:ring-offset-gray-800"
                >
                    Definir Orçamento (e a ilusão de controle)
                </button>
            </form>

            {/* List of current budgets and their progress */}
            <h3 className="text-2xl font-bold text-gray-300 mb-4 text-center">
                Seus Orçamentos (Boa Sorte com Isso!)
            </h3>
            {budgets.length === 0 ? (
                <p className="text-gray-400 text-center py-4">
                    Nenhum orçamento definido. Estão vivendo perigosamente, hein?
                </p>
            ) : (
                <ul className="space-y-4">
                    {budgets.map(budget => {
                        const spent = getSpentAmount(budget.category); // Get spent amount for this category
                        const remaining = budget.limit - spent; // Calculate remaining budget
                        const progress = (spent / budget.limit) * 100; // Calculate percentage spent
                        let progressColor = 'bg-green-500'; // Default to green
                        let progressMessage = 'Dentro do limite! Milagre!';

                        // Change progress bar color and message based on spending
                        if (progress > 100) {
                            progressColor = 'bg-red-500'; // Over budget is red
                            progressMessage = 'Estourou o orçamento! Sabíamos que ia dar errado.';
                        } else if (progress > 75) {
                            progressColor = 'bg-yellow-500'; // Nearing limit is yellow
                            progressMessage = 'Quase lá! Apertem os cintos, ou os bolsos.';
                        }

                        return (
                            <li key={budget.category} className="bg-gray-700 rounded-lg p-6 shadow-md border border-gray-600">
                                <div className="flex justify-between items-center mb-3">
                                    <div>
                                        <h4 className="text-xl font-bold text-white mb-1">{budget.category}</h4>
                                        <p className="text-sm text-gray-400">
                                            Limite Mensal: R$ {budget.limit.toFixed(2).replace('.', ',')}
                                        </p>
                                        <p className="text-lg font-semibold text-gray-200">
                                            Gasto: R$ {spent.toFixed(2).replace('.', ',')}
                                        </p>
                                    </div>
                                    {/* Button to delete budget */}
                                    <button
                                        onClick={() => deleteBudget(budget.category)}
                                        className="p-2 text-red-400 hover:text-red-200 rounded-full hover:bg-gray-600 transition duration-150"
                                        title="Remover este orçamento (e a responsabilidade)"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </div>
                                {/* Progress bar for budget */}
                                <div className="w-full bg-gray-600 rounded-full h-2.5 mb-3">
                                    <div
                                        className={`${progressColor} h-2.5 rounded-full`}
                                        style={{ width: `${progress > 100 ? 100 : progress}%` }}
                                    ></div>
                                </div>
                                <p className="text-sm text-gray-300 mb-2 text-center">
                                    Progresso: {progress.toFixed(1)}% ({progressMessage})
                                </p>
                                <p className={`text-center font-bold ${remaining >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    Restante: R$ {remaining.toFixed(2).replace('.', ',')}
                                </p>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
};



// Gratitude Journal Tab Component: Allows users to record their financial mood and reflections
const GratitudeJournalTab = ({ journalEntries, addJournalEntry, deleteJournalEntry, setMessage }) => {
    const [newEntry, setNewEntry] = useState('');
    const [selectedMood, setSelectedMood] = useState('😐'); // Default mood emoji

    // Predefined moods with emojis and descriptions
    const moods = [
        { emoji: '😁', description: 'Esperançoso (mas ainda com medo)' },
        { emoji: '😐', description: 'Neutro (o dinheiro está estagnado)' },
        { emoji: '😬', description: 'Preocupado (o boleto está chamando)' },
        { emoji: '😭', description: 'Desesperado (o banco ligou)' },
        { emoji: '😡', description: 'Revoltado (alguém gastou demais)' },
        { emoji: '🥳', description: 'Feliz (achou dinheiro na rua)' },
        { emoji: '🫠', description: 'Derretendo (as dívidas estão demais)' }
    ];

    // Handles the form submission for adding a new journal entry
    const handleSubmitEntry = (e) => {
        e.preventDefault();
        if (newEntry.trim()) {
            addJournalEntry(newEntry.trim(), selectedMood); // Pass entry text and selected mood
            setNewEntry(''); // Clear text input
            setSelectedMood('😐'); // Reset mood to default
        } else {
            setMessage("Escreva algo! Mesmo que seja sobre a alegria de ter papel higiênico.");
            setTimeout(() => setMessage(''), 3000);
        }
    };

    return (
        <div className="bg-gray-800 rounded-lg p-6 shadow-2xl border border-gray-700">
            <h2 className="text-3xl font-extrabold text-gray-200 mb-6 text-center">
                ✍️ Diário de Humor Financeiro (Irônico) ✍️
            </h2>
            <p className="text-gray-400 mb-8 text-center">
                Um espaço para vocês "refletirem" sobre as bençãos e maldições financeiras do dia, e como isso afeta seu humor.
            </p>

            {/* Form for adding a new journal entry */}
            <form onSubmit={handleSubmitEntry} className="space-y-4 bg-gray-700 p-6 rounded-lg shadow-md mb-8 border border-gray-600">
                <h3 className="text-xl font-bold text-gray-300 mb-3 text-center">O Milagre (ou Pesadelo) do Dia:</h3>
                <div>
                    <label htmlFor="journalEntry" className="block text-sm font-medium text-gray-400 mb-1">
                        Sua reflexão sincera (ou nem tanto):
                    </label>
                    <textarea
                        id="journalEntry"
                        className="w-full p-3 rounded-md bg-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 border border-gray-500 min-h-[100px]"
                        placeholder="Ex: Sou grato(a) por ter encontrado uma moeda de 5 centavos hoje. Quase me salvou!"
                        value={newEntry}
                        onChange={(e) => setNewEntry(e.target.value)}
                        required
                    />
                </div>
                {/* Dropdown for selecting mood emoji */}
                <div>
                    <label htmlFor="moodSelect" className="block text-sm font-medium text-gray-400 mb-1">
                        Como o dinheiro te fez sentir hoje?
                    </label>
                    <select
                        id="moodSelect"
                        className="w-full p-3 rounded-md bg-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-yellow-500 border border-gray-500"
                        value={selectedMood}
                        onChange={(e) => setSelectedMood(e.target.value)}
                    >
                        {moods.map(mood => (
                            <option key={mood.emoji} value={mood.emoji}>
                                {mood.emoji} {mood.description}
                            </option>
                        ))}
                    </select>
                </div>
                <button
                    type="submit"
                    className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-3 px-6 rounded-lg shadow-xl transform transition duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 focus:ring-offset-gray-800"
                >
                    Registrar Humor (e a realidade)
                </button>
            </form>

            {/* List of past journal entries */}
            <h3 className="text-2xl font-bold text-gray-300 mb-4 text-center">
                Suas Reflexões (preparem-se para a verdade)
            </h3>
            {journalEntries.length === 0 ? (
                <p className="text-gray-400 text-center py-4">
                    Nenhuma reflexão ainda. A vida financeira está tão boa que não há o que lamentar? Duvido!
                </p>
            ) : (
                <ul className="space-y-4">
                    {journalEntries.map(entry => (
                        <li key={entry.id} className="bg-gray-700 rounded-lg p-6 shadow-md border border-gray-600">
                            <div className="flex justify-between items-start mb-2">
                                <span className="text-lg font-bold mr-3">{entry.mood}</span> {/* Display mood emoji */}
                                <p className="text-lg text-white flex-grow">{entry.text}</p>
                                {/* Button to delete journal entry */}
                                <button
                                    onClick={() => deleteJournalEntry(entry.id)}
                                    className="p-1 text-red-400 hover:text-red-200 rounded-full hover:bg-gray-600 transition duration-150"
                                    title="Excluir essa revelação"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                            <p className="text-sm text-gray-400 text-right">
                                {new Date(entry.date).toLocaleDateString('pt-BR')}
                            </p>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};


// Export the main App component for rendering
export default App;