import { apiDelete, apiGet, apiPost, apiPut, compactApiParams } from "@/services/api/request";
import type { CanvasBackgroundMode } from "@/lib/canvas-theme";
import type { CanvasAssistantSession, CanvasConnection, CanvasNodeData, ViewportTransform } from "@/app/(user)/canvas/types";

export type CloudWorkflow = {
    id: string;
    userId: string;
    title: string;
    nodes: CanvasNodeData[];
    connections: CanvasConnection[];
    chatSessions: CanvasAssistantSession[];
    activeChatId: string | null;
    backgroundMode: CanvasBackgroundMode;
    showImageInfo: boolean;
    viewport: ViewportTransform;
    sourceShareId: string;
    sourceWorkflowId: string;
    sourceSyncMode: "none" | "detached" | "linked";
    sourceVersion: number;
    createdAt: string;
    updatedAt: string;
    deletedAt: string;
};

export type WorkflowListResponse = {
    items: CloudWorkflow[];
    total: number;
};

export type SaveWorkflowInput = Pick<CloudWorkflow, "title" | "nodes" | "connections" | "chatSessions" | "activeChatId" | "backgroundMode" | "showImageInfo" | "viewport">;

export type WorkflowSharePreview = {
    id: string;
    token: string;
    title: string;
    version: number;
    requiresPassword: boolean;
    snapshot?: CloudWorkflow;
    owner: { id: string; username: string; displayName: string; avatarUrl: string };
    sourceWorkflowId: string;
};

export async function fetchWorkflows(token: string, query: { keyword?: string; page?: number; pageSize?: number } = {}) {
    return apiGet<WorkflowListResponse>("/api/v1/workflows", compactApiParams(query), token);
}

export async function fetchWorkflow(token: string, id: string) {
    return apiGet<CloudWorkflow>(`/api/v1/workflows/${encodeURIComponent(id)}`, undefined, token);
}

export async function createWorkflow(token: string, input: Partial<SaveWorkflowInput>) {
    return apiPost<CloudWorkflow>("/api/v1/workflows", input, token);
}

export async function updateWorkflow(token: string, id: string, input: SaveWorkflowInput) {
    return apiPut<CloudWorkflow>(`/api/v1/workflows/${encodeURIComponent(id)}`, input, token);
}

export async function deleteWorkflow(token: string, id: string) {
    return apiDelete<boolean>(`/api/v1/workflows/${encodeURIComponent(id)}`, token);
}

export async function shareWorkflow(token: string, id: string, input: { passwordEnabled: boolean; password?: string }) {
    return apiPost<{ shareUrl: string; share: { id: string; token: string; version: number; passwordEnabled: boolean } }>(`/api/v1/workflows/${encodeURIComponent(id)}/share`, input, token);
}

export async function fetchWorkflowShare(token: string, shareToken: string, shareAccessToken?: string) {
    return apiGet<WorkflowSharePreview>(`/api/v1/workflow-shares/${encodeURIComponent(shareToken)}`, shareAccessToken ? { shareAccessToken } : undefined, token);
}

export async function verifyWorkflowShare(token: string, shareToken: string, password: string) {
    return apiPost<{ preview: WorkflowSharePreview; shareAccessToken: string }>(`/api/v1/workflow-shares/${encodeURIComponent(shareToken)}/verify`, { password }, token);
}

export async function copyWorkflowShare(token: string, shareToken: string, input: { mode: "detached" | "linked"; password?: string; shareAccessToken?: string }) {
    return apiPost<CloudWorkflow>(`/api/v1/workflow-shares/${encodeURIComponent(shareToken)}/copy`, input, token);
}
