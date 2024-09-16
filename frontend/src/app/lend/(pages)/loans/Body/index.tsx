"use client"
import { Loading } from "@/components/Loading";
import { Loan } from "@/types/ApiInterface";
import { ABI_ADDRESS, NETWORK } from "@/utils/env";
import { shortenAddress } from "@/utils/shortenAddress";
import { useWallet } from "@aptos-labs/wallet-adapter-react"
import Image from "next/image";
import Link from "next/link";
import React, { useCallback, useEffect, useState } from "react";
import { useApp } from "@/context/AppProvider";
import { interestPercentage } from "@/utils/math";
import { Clock } from "@/components/Clock";
import { secInADay } from "@/utils/time";
import { aptos } from "@/utils/aptos";
import { toast } from "sonner";
export function Body() {
    const { getAssetByType } = useApp();
    const { account, signAndSubmitTransaction } = useWallet();
    const [loading, setLoading] = useState(true)
    const [activeLoans, setActiveLoans] = useState<Loan[]>([]);
    const [prevLoans, setPrevLoans] = useState<Loan[]>([])
    const fetchLoans = useCallback(async () => {
        if (!account?.address) return;
        try {
            const res = await fetch(`/api/lend?address=${account.address}&status=borrowed`);
            const response = await res.json();
            if (res.ok) {
                setActiveLoans(response.data)
            }
            const prevRes = await fetch(`/api/lend/previous?address=${account.address}`);
            const prevResponse = await prevRes.json();
            if (prevRes.ok) {
                setPrevLoans(prevResponse.data)
            }
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }, [account?.address])
    const onGrab = async(offer: Loan) => {
        if (!account?.address || !offer.borrow_obj) return;
        try {
            const functionArguments = [
                offer.borrow_obj
            ];
            const response = await signAndSubmitTransaction({
                sender: account.address,
                data: {
                    function: `${ABI_ADDRESS}::nft_lending::grab`,
                    typeArguments:[],
                    functionArguments
                },
            });
            await aptos.waitForTransaction({
                transactionHash: response.hash
            })
            const res = await fetch(`/api/lend/grab/${offer._id}`, {
                method: "PUT",
                headers: {
                    contentType: "application/json"
                },
                body: JSON.stringify({ address: account.address })
            });
            const apiRes = await res.json();
            if (!res.ok) {
                throw new Error(apiRes.message)
            }
            toast.success("NFT Grabbed")
        } catch (error) {
            let errorMessage = typeof error === "string" ? error : `An unexpected error has occured`;
            if (error instanceof Error) {
                errorMessage = error.message;
            }
            toast.error(errorMessage)
        } finally {

        }
    }
    useEffect(() => {
        fetchLoans()
    }, [fetchLoans]);
    if (loading) return <Loading />
    return (
        <React.Fragment>
            <h4 className="loans-title">Active Loans</h4>
            <table className="table mt-3">
                <thead>
                    <tr>
                        <th>Asset</th>
                        <th>Borrower</th>
                        <th>Interest</th>
                        <th>APR</th>
                        <th>Duration</th>
                        <th>Countdown</th>
                        <th>Loan</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>
                    {
                        activeLoans.map((item) => (
                            <tr key={`borrowed -${item._id}`}>
                                <td>
                                    <Image src={item.forListing.token_icon} className="rounded me-2" alt={item.forListing.token_name} width={37} height={37} />
                                    <span>{item.forListing.token_name}</span>
                                </td>
                                <td>
                                    <Link href={`https://explorer.aptoslabs.com/account/${item.forAddress}?network=${NETWORK}`} target="_blank">
                                        {shortenAddress(item.forAddress)}
                                    </Link>
                                </td>
                                <td>{interestPercentage(item.apr, item.duration)}%</td>
                                <td>{item.apr}%</td>
                                <td>{item.duration} day/days</td>
                                <td>{item.start_timestamp ? <Clock timestamp={item.start_timestamp + item.duration * secInADay} /> : ""}</td>
                                <td>{item.amount} {getAssetByType(item.coin)?.symbol}</td>
                                <td>
                                    <button className="action-btn" onClick={()=>onGrab(item)}>Get NFT</button>
                                </td>
                            </tr>
                        ))
                    }
                </tbody>
            </table>
            <h4 className="mt-5 loans-title">Previous Loans</h4>
            <table className="table mt-3">
                <thead>
                    <tr>
                        <th>Asset</th>
                        <th>Borrower</th>
                        <th>Interest</th>
                        <th>APR</th>
                        <th>Duration</th>
                        <th>Loan Value</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    {
                        prevLoans.map((item) => (
                            <tr key={`lend -${item._id}`}>
                                <td>
                                    <Image src={item.forListing.token_icon} className="rounded me-2" alt={item.forListing.token_name} width={37} height={37} />
                                    <span>{item.forListing.token_name}</span>
                                </td>
                                <td>
                                    <Link href={`https://explorer.aptoslabs.com/account/${item.address}?network=${NETWORK}`} target="_blank">
                                        {shortenAddress(item.address)}
                                    </Link>
                                </td>
                                <td>{interestPercentage(item.apr, item.duration)}%</td>
                                <td>{item.apr} %</td>
                                <td>{item.duration} day/days</td>
                                <td>{item.amount} {getAssetByType(item.coin)?.symbol}</td>
                                <td>{item.status}</td>
                            </tr>
                        ))
                    }
                </tbody>
            </table>
        </React.Fragment>

    )
}