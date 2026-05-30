import { apiGet, apiPost } from "@/services/api/request";

export type Plan = {
    id: string;
    code: "go" | "plus" | "pro" | "max";
    name: string;
    description: string;
    priceCents: number;
    currency: string;
    credits: number;
    workflowCreateCredits: number;
    enabled: boolean;
    recommended: boolean;
    sort: number;
};

export async function fetchPlans() {
    return apiGet<Plan[]>("/api/v1/plans");
}

export async function createStripeCheckout(token: string, planId: string) {
    return apiPost<{ checkoutUrl: string; orderId: string }>("/api/v1/checkout/stripe", { planId }, token);
}

export async function fetchKycStatus(token: string) {
    return apiGet<{ enabled: boolean; provider: string; status: string; rewards: { credits: number; workflowCreateCredits: number } }>("/api/v1/kyc/status", undefined, token);
}

export async function createKycSession(token: string) {
    return apiPost<{ url: string; status: string }>("/api/v1/kyc/session", {}, token);
}
