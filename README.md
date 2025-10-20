## Week 6 — Automated Market Maker (AMM)

### Summary

This week’s challenge focused on building a fully functional **AMM (Automated Market Maker)** smart contract on **Lisk Sepolia**.  
The goal was to recreate Uniswap-like token swapping and liquidity pooling logic from scratch — all on-chain, without external dependencies.

### What I Did

- Built `SimpleDEX.sol` smart contract to handle token swaps and liquidity pools
- Implemented the core constant-product formula (x \* y = k) for pricing
- Added LP token minting and burning mechanisms
- Integrated add/remove liquidity functions with share-based rewards
- Created a clean Next.js frontend for interacting with the AMM
- Deployed ERC20 tokens and AMM contract to Lisk Sepolia Testnet
- Verified contracts and tested various swap/liquidity edge cases

### Why This Week Was Great

This week took DeFi fundamentals to the next level.  
I learned how real DEXs like Uniswap handle price changes, slippage, and liquidity math — all while making it interactive on Lisk.  
It’s both humbling and thrilling to see decentralized finance concepts come alive in my own smart contract! 💧
