"use client";

import { useEffect, useState } from "react";
import { formatUnits, parseUnits } from "viem";
import { useAccount } from "wagmi";
import { useDeployedContractInfo, useScaffoldContractRead, useScaffoldContractWrite } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";

export const SwapPanel = () => {
  const { address: connectedAddress } = useAccount();
  const [inputAmount, setInputAmount] = useState("");
  const [outputAmount, setOutputAmount] = useState("");
  const [isTokenAInput, setIsTokenAInput] = useState(true);
  const [isApprovedA, setIsApprovedA] = useState(false);
  const [isApprovedB, setIsApprovedB] = useState(false);

  const { data: simpleDex } = useDeployedContractInfo("SimpleDEX");

  const { data: tokenAAddress } = useScaffoldContractRead({
    contractName: "SimpleDEX",
    functionName: "tokenA",
  });

  const { data: tokenBAddress } = useScaffoldContractRead({
    contractName: "SimpleDEX",
    functionName: "tokenB",
  });

  const { data: balanceA } = useScaffoldContractRead({
    contractName: "MyToken",
    functionName: "balanceOf",
    args: [connectedAddress],
  });

  const { data: balanceB } = useScaffoldContractRead({
    contractName: "SimpleUSDC",
    functionName: "balanceOf",
    args: [connectedAddress],
  });

  const { data: symbolA } = useScaffoldContractRead({
    contractName: "MyToken",
    functionName: "symbol",
  });

  const { data: symbolB } = useScaffoldContractRead({
    contractName: "SimpleUSDC",
    functionName: "symbol",
  });

  const { data: allowanceA, refetch: refetchAllowanceA } = useScaffoldContractRead({
    contractName: "MyToken",
    functionName: "allowance",
    args: [connectedAddress, simpleDex?.address],
  });

  const { data: allowanceB, refetch: refetchAllowanceB } = useScaffoldContractRead({
    contractName: "SimpleUSDC",
    functionName: "allowance",
    args: [connectedAddress, simpleDex?.address],
  });

  // ✅ Check pool reserves
  const { data: reserves } = useScaffoldContractRead({
    contractName: "SimpleDEX",
    functionName: "getReserves",
  });

  const reserveA = reserves?.[0] || 0n;
  const reserveB = reserves?.[1] || 0n;
  const hasLiquidity = reserveA > 0n && reserveB > 0n;

  useEffect(() => {
    if (!inputAmount || isNaN(Number(inputAmount))) {
      setIsApprovedA(false);
      setIsApprovedB(false);
      return;
    }

    const amountBN = parseUnits(inputAmount, isTokenAInput ? 18 : 6);
    const allowA = BigInt(allowanceA ?? 0n);
    const allowB = BigInt(allowanceB ?? 0n);

    setIsApprovedA(allowA >= amountBN);
    setIsApprovedB(allowB >= amountBN);
  }, [inputAmount, allowanceA, allowanceB, isTokenAInput]);

  const { data: swapQuote } = useScaffoldContractRead({
    contractName: "SimpleDEX",
    functionName: "getSwapAmount",
    args: [isTokenAInput ? tokenAAddress : tokenBAddress, parseUnits(inputAmount, isTokenAInput ? 18 : 6)],
  });

  useEffect(() => {
    if (!swapQuote || !inputAmount) {
      setOutputAmount("");
      return;
    }
    const formatted = formatUnits(swapQuote, isTokenAInput ? 6 : 18);
    setOutputAmount(parseFloat(formatted).toFixed(6));
  }, [swapQuote, isTokenAInput, inputAmount]);

  const { writeAsync: approveWriteA } = useScaffoldContractWrite({
    contractName: "MyToken",
    functionName: "approve",
    args: [simpleDex?.address, parseUnits(inputAmount, 18)],
  });

  const { writeAsync: approveWriteB } = useScaffoldContractWrite({
    contractName: "SimpleUSDC",
    functionName: "approve",
    args: [simpleDex?.address, parseUnits(inputAmount, 6)],
  });

  const { writeAsync: swapWrite, isLoading: isSwapping } = useScaffoldContractWrite({
    contractName: "SimpleDEX",
    functionName: "swap",
    args: [isTokenAInput ? tokenAAddress : tokenBAddress, parseUnits(inputAmount, isTokenAInput ? 18 : 6)],
  });

  const handleApprove = async () => {
    if (!simpleDex?.address) {
      notification.error("DEX address not ready");
      return;
    }
    if (!inputAmount || parseFloat(inputAmount) <= 0) {
      notification.error("Enter a valid amount");
      return;
    }

    // ✅ Check if user has enough balance
    const inputAmountBN = parseUnits(inputAmount, isTokenAInput ? 18 : 6);
    const currentBalance = isTokenAInput ? balanceA : balanceB;
    if (currentBalance && inputAmountBN > currentBalance) {
      notification.error(`Insufficient ${isTokenAInput ? symbolA : symbolB} balance`);
      return;
    }

    try {
      if (isTokenAInput) {
        await approveWriteA();
        notification.success("Token A approved!");
        setTimeout(() => refetchAllowanceA(), 2000);
      } else {
        await approveWriteB();
        notification.success("Token B approved!");
        setTimeout(() => refetchAllowanceB(), 2000);
      }
    } catch {
      notification.error("Approval failed");
    }
  };

  const handleSwap = async () => {
    if (!inputAmount || parseFloat(inputAmount) <= 0) {
      notification.error("Enter a valid amount");
      return;
    }
    if (!tokenAAddress || !tokenBAddress) {
      notification.error("Token addresses not ready");
      return;
    }

    // ✅ Check if pool has liquidity
    if (!hasLiquidity) {
      notification.error("No liquidity in pool. Cannot swap.");
      return;
    }

    // ✅ Check if user has enough balance
    const inputAmountBN = parseUnits(inputAmount, isTokenAInput ? 18 : 6);
    const currentBalance = isTokenAInput ? balanceA : balanceB;
    if (currentBalance && inputAmountBN > currentBalance) {
      notification.error(`Insufficient ${isTokenAInput ? symbolA : symbolB} balance`);
      return;
    }

    try {
      await swapWrite();
      notification.success("Swap successful!");
      setInputAmount("");
      setOutputAmount("");
    } catch {
      notification.error("Swap failed");
    }
  };

  const handleFlipTokens = () => {
    setIsTokenAInput(!isTokenAInput);
    setInputAmount("");
    setOutputAmount("");
  };

  const formatBalance = (balance: bigint | undefined, decimals: number) => {
    if (!balance) return "0.0000";
    return parseFloat(formatUnits(balance, decimals)).toFixed(4);
  };

  const needsApproval = isTokenAInput ? !isApprovedA : !isApprovedB;
  const disableAction = !connectedAddress || !inputAmount || parseFloat(inputAmount) <= 0 || isSwapping;

  // ✅ Check if input amount exceeds balance
  const inputAmountBN = inputAmount ? parseUnits(inputAmount, isTokenAInput ? 18 : 6) : 0n;
  const currentBalance = isTokenAInput ? balanceA : balanceB;
  const exceedsBalance = currentBalance && inputAmountBN > currentBalance;

  return (
    <div className="card w-full max-w-md bg-base-100 shadow-xl">
      <div className="card-body">
        <h2 className="card-title justify-center">Swap Tokens</h2>

        {!hasLiquidity && (
          <div className="alert alert-warning">
            <span className="text-sm">⚠️ No liquidity in pool. Add liquidity first.</span>
          </div>
        )}

        <div className="form-control">
          <label className="label">
            <span className="label-text">From</span>
            <span className="label-text-alt">
              Balance: {formatBalance(isTokenAInput ? balanceA : balanceB, isTokenAInput ? 18 : 6)}{" "}
              {isTokenAInput ? symbolA : symbolB}
            </span>
          </label>
          <div className="input-group">
            <input
              disabled={isSwapping}
              type="number"
              placeholder="0.0"
              className="input input-bordered w-full"
              value={inputAmount}
              onChange={e => setInputAmount(e.target.value)}
            />
            <span className="btn btn-ghost">{isTokenAInput ? symbolA : symbolB}</span>
          </div>
          {!!exceedsBalance && (
            <label className="label">
              <span className="label-text-alt text-error">⚠️ Insufficient balance</span>
            </label>
          )}
        </div>

        <div className="flex justify-center mt-2">
          <button className="btn btn-circle btn-sm" onClick={handleFlipTokens}>
            ⇅
          </button>
        </div>

        <div className="form-control mt-2">
          <label className="label">
            <span className="label-text">To</span>
            <span className="label-text-alt">
              Balance: {formatBalance(isTokenAInput ? balanceB : balanceA, isTokenAInput ? 6 : 18)}{" "}
              {isTokenAInput ? symbolB : symbolA}
            </span>
          </label>
          <div className="input-group">
            <input
              type="number"
              placeholder="0.0"
              className="input input-bordered w-full"
              value={outputAmount}
              readOnly
            />
            <span className="btn btn-ghost">{isTokenAInput ? symbolB : symbolA}</span>
          </div>
        </div>

        {inputAmount && outputAmount && (
          <div className="alert alert-info mt-2">
            <span className="text-sm">
              Rate: 1 {isTokenAInput ? symbolA : symbolB} ≈{" "}
              {(parseFloat(outputAmount) / parseFloat(inputAmount)).toFixed(6)} {isTokenAInput ? symbolB : symbolA}
            </span>
          </div>
        )}

        <div className="card-actions justify-end mt-4">
          {needsApproval ? (
            <button
              className="btn btn-primary btn-block"
              onClick={handleApprove}
              disabled={disableAction || !!exceedsBalance}
            >
              Approve {isTokenAInput ? symbolA : symbolB}
            </button>
          ) : (
            <button
              className="btn btn-primary btn-block"
              onClick={handleSwap}
              disabled={disableAction || !!exceedsBalance || !hasLiquidity}
            >
              {isSwapping ? "Swapping..." : "Swap"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
