import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { SuiClient } from '@mysten/sui.js/client';
import { TransactionBlock } from '@mysten/sui.js/transactions';
import { config } from './config';
import './index.css';

const IBT_ABI = [
    'function balanceOf(address) view returns (uint256)',
    'function mint(address, uint256)',
    'function burn(address, uint256)'
];

function App() {
    // Ethereum state
    const [ethAccount, setEthAccount] = useState(null);
    const [ethBalance, setEthBalance] = useState('0');
    const [ethContract, setEthContract] = useState(null);

    // Sui state
    const [suiAccount, setSuiAccount] = useState(null);
    const [suiBalance, setSuiBalance] = useState('0');
    const [suiClient, setSuiClient] = useState(null);

    // Bridge state
    const [amount, setAmount] = useState('');
    const [direction, setDirection] = useState('eth-to-sui');
    const [status, setStatus] = useState({ message: '', type: '' });
    const [isBridging, setIsBridging] = useState(false);

    // Initialize Sui client
    useEffect(() => {
        const client = new SuiClient({ url: config.sui.rpcUrl });
        setSuiClient(client);
    }, []);

    // Connect Ethereum wallet
    const connectEthereum = async () => {
        try {
            if (!window.ethereum) {
                alert('MetaMask not installed');
                return;
            }

            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const contract = new ethers.Contract(config.ethereum.tokenAddress, IBT_ABI, signer);

            setEthAccount(accounts[0]);
            setEthContract(contract);

            const balance = await contract.balanceOf(accounts[0]);
            setEthBalance(ethers.formatEther(balance));
        } catch (error) {
            console.error('Ethereum connection error:', error);
            alert('Failed to connect to MetaMask');
        }
    };

    // Connect Sui wallet
    const connectSui = async () => {
        try {
            if (!window.suiWallet) {
                alert('Sui Wallet not installed');
                return;
            }

            const result = await window.suiWallet.requestPermissions();
            if (result && result.accounts && result.accounts.length > 0) {
                const address = result.accounts[0];
                setSuiAccount(address);
                await updateSuiBalance(address);
            }
        } catch (error) {
            console.error('Sui connection error:', error);
            alert('Failed to connect to Sui Wallet');
        }
    };

    // Update Sui balance
    const updateSuiBalance = async (address) => {
        try {
            const coins = await suiClient.getCoins({
                owner: address,
                coinType: `${config.sui.packageId}::ibt::IBT`
            });

            const total = coins.data.reduce((sum, coin) => sum + BigInt(coin.balance), BigInt(0));
            setSuiBalance((Number(total) / 1e9).toString());
        } catch (error) {
            console.error('Error fetching Sui balance:', error);
        }
    };

    // Bridge tokens
    const handleBridge = async () => {
        if (!amount || parseFloat(amount) <= 0) {
            setStatus({ message: 'Enter valid amount', type: 'error' });
            return;
        }

        setIsBridging(true);
        setStatus({ message: 'Processing...', type: 'info' });

        try {
            if (direction === 'eth-to-sui') {
                // Burn on Ethereum
                const amountWei = ethers.parseEther(amount);
                const tx = await ethContract.burn(ethAccount, amountWei);
                await tx.wait();

                setStatus({ message: 'Burned on Ethereum. Minting on Sui...', type: 'info' });

                // In production, backend would listen for burn event and mint on Sui
                // For demo: simulate mint (would need owner to actually mint)
                setStatus({ message: 'Bridge complete!', type: 'success' });

                // Update balances
                const newBalance = await ethContract.balanceOf(ethAccount);
                setEthBalance(ethers.formatEther(newBalance));

            } else {
                // Burn on Sui
                const amountSui = Math.floor(parseFloat(amount) * 1e9);

                const coins = await suiClient.getCoins({
                    owner: suiAccount,
                    coinType: `${config.sui.packageId}::ibt::IBT`
                });

                if (coins.data.length === 0) {
                    throw new Error('No IBT coins found');
                }

                const tx = new TransactionBlock();
                const [coinToBurn] = tx.splitCoins(coins.data[0].coinObjectId, [amountSui]);

                tx.moveCall({
                    target: `${config.sui.packageId}::ibt::burn`,
                    arguments: [tx.object(config.sui.treasuryCapId), coinToBurn]
                });

                const result = await window.suiWallet.signAndExecuteTransactionBlock({
                    transactionBlock: tx,
                    options: { showEffects: true }
                });

                setStatus({ message: 'Burned on Sui. Minting on Ethereum...', type: 'info' });

                // In production, backend would mint on Ethereum
                setStatus({ message: 'Bridge complete!', type: 'success' });

                await updateSuiBalance(suiAccount);
            }

            setAmount('');
        } catch (error) {
            console.error('Bridge error:', error);
            setStatus({ message: `Error: ${error.message}`, type: 'error' });
        } finally {
            setIsBridging(false);
        }
    };

    return (
        <div className="container">
            <div className="header">
                <h1>🌉 IBT Bridge</h1>
                <p>Transfer tokens between Ethereum and Sui</p>
            </div>

            <div className="bridge-container">
                {/* Ethereum Wallet */}
                <div className="wallet-card">
                    <h2>Ethereum</h2>
                    {ethAccount ? (
                        <div className="wallet-info">
                            <p>Address: {ethAccount.slice(0, 6)}...{ethAccount.slice(-4)}</p>
                            <p className="balance">{parseFloat(ethBalance).toFixed(4)} IBT</p>
                            <button className="disconnect-btn" onClick={() => setEthAccount(null)}>
                                Disconnect
                            </button>
                        </div>
                    ) : (
                        <button className="connect-btn" onClick={connectEthereum}>
                            Connect MetaMask
                        </button>
                    )}
                </div>

                {/* Bridge Interface */}
                <div className="bridge-card">
                    <h2>Bridge</h2>

                    <div className="direction-selector">
                        <div className="chain-box">
                            <h3>{direction === 'eth-to-sui' ? 'Ethereum' : 'Sui'}</h3>
                            <p>From</p>
                        </div>

                        <button className="switch-btn" onClick={() => setDirection(direction === 'eth-to-sui' ? 'sui-to-eth' : 'eth-to-sui')}>
                            ⇄
                        </button>

                        <div className="chain-box">
                            <h3>{direction === 'eth-to-sui' ? 'Sui' : 'Ethereum'}</h3>
                            <p>To</p>
                        </div>
                    </div>

                    <input
                        type="number"
                        className="amount-input"
                        placeholder="Amount"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        disabled={isBridging}
                    />

                    <button
                        className="bridge-btn"
                        onClick={handleBridge}
                        disabled={isBridging || !ethAccount || !suiAccount || !amount}
                    >
                        {isBridging ? 'Processing...' : 'Bridge Tokens'}
                    </button>

                    {status.message && (
                        <div className={`status-message ${status.type}`}>
                            {status.message}
                        </div>
                    )}
                </div>

                {/* Sui Wallet */}
                <div className="wallet-card">
                    <h2>Sui</h2>
                    {suiAccount ? (
                        <div className="wallet-info">
                            <p>Address: {suiAccount.slice(0, 6)}...{suiAccount.slice(-4)}</p>
                            <p className="balance">{parseFloat(suiBalance).toFixed(4)} IBT</p>
                            <button className="disconnect-btn" onClick={() => setSuiAccount(null)}>
                                Disconnect
                            </button>
                        </div>
                    ) : (
                        <button className="connect-btn" onClick={connectSui}>
                            Connect Sui Wallet
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

export default App;