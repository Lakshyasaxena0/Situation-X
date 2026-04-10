import type { QueryKey, UseMutationOptions, UseMutationResult, UseQueryOptions, UseQueryResult } from "@tanstack/react-query";
import type { AnalysisHistoryResponse, AnalysisRecord, AnalysisResult, AnalyzeRequest, CreateFeedbackRequest, DeleteResponse, ErrorResponse, FeedbackItem, FeedbackListResponse, GetAnalysisHistoryParams, GetFeedbackListParams, HealthStatus } from "./api.schemas";
import { customFetch } from "../custom-fetch";
import type { ErrorType, BodyType } from "../custom-fetch";
type AwaitedInput<T> = PromiseLike<T> | T;
type Awaited<O> = O extends AwaitedInput<infer T> ? T : never;
type SecondParameter<T extends (...args: never) => unknown> = Parameters<T>[1];
/**
 * @summary Health check
 */
export declare const getHealthCheckUrl: () => string;
export declare const healthCheck: (options?: RequestInit) => Promise<HealthStatus>;
export declare const getHealthCheckQueryKey: () => readonly ["/api/healthz"];
export declare const getHealthCheckQueryOptions: <TData = Awaited<ReturnType<typeof healthCheck>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData> & {
    queryKey: QueryKey;
};
export type HealthCheckQueryResult = NonNullable<Awaited<ReturnType<typeof healthCheck>>>;
export type HealthCheckQueryError = ErrorType<unknown>;
/**
 * @summary Health check
 */
export declare function useHealthCheck<TData = Awaited<ReturnType<typeof healthCheck>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Analyze a situation
 */
export declare const getAnalyzeSituationUrl: () => string;
export declare const analyzeSituation: (analyzeRequest: AnalyzeRequest, options?: RequestInit) => Promise<AnalysisResult>;
export declare const getAnalyzeSituationMutationOptions: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof analyzeSituation>>, TError, {
        data: BodyType<AnalyzeRequest>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof analyzeSituation>>, TError, {
    data: BodyType<AnalyzeRequest>;
}, TContext>;
export type AnalyzeSituationMutationResult = NonNullable<Awaited<ReturnType<typeof analyzeSituation>>>;
export type AnalyzeSituationMutationBody = BodyType<AnalyzeRequest>;
export type AnalyzeSituationMutationError = ErrorType<ErrorResponse>;
/**
 * @summary Analyze a situation
 */
export declare const useAnalyzeSituation: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof analyzeSituation>>, TError, {
        data: BodyType<AnalyzeRequest>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof analyzeSituation>>, TError, {
    data: BodyType<AnalyzeRequest>;
}, TContext>;
/**
 * @summary Get analysis history
 */
export declare const getGetAnalysisHistoryUrl: (params?: GetAnalysisHistoryParams) => string;
export declare const getAnalysisHistory: (params?: GetAnalysisHistoryParams, options?: RequestInit) => Promise<AnalysisHistoryResponse>;
export declare const getGetAnalysisHistoryQueryKey: (params?: GetAnalysisHistoryParams) => readonly ["/api/analysis/history", ...GetAnalysisHistoryParams[]];
export declare const getGetAnalysisHistoryQueryOptions: <TData = Awaited<ReturnType<typeof getAnalysisHistory>>, TError = ErrorType<unknown>>(params?: GetAnalysisHistoryParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getAnalysisHistory>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getAnalysisHistory>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetAnalysisHistoryQueryResult = NonNullable<Awaited<ReturnType<typeof getAnalysisHistory>>>;
export type GetAnalysisHistoryQueryError = ErrorType<unknown>;
/**
 * @summary Get analysis history
 */
export declare function useGetAnalysisHistory<TData = Awaited<ReturnType<typeof getAnalysisHistory>>, TError = ErrorType<unknown>>(params?: GetAnalysisHistoryParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getAnalysisHistory>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Get analysis by ID
 */
export declare const getGetAnalysisByIdUrl: (id: number) => string;
export declare const getAnalysisById: (id: number, options?: RequestInit) => Promise<AnalysisRecord>;
export declare const getGetAnalysisByIdQueryKey: (id: number) => readonly [`/api/analysis/history/${number}`];
export declare const getGetAnalysisByIdQueryOptions: <TData = Awaited<ReturnType<typeof getAnalysisById>>, TError = ErrorType<ErrorResponse>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getAnalysisById>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getAnalysisById>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetAnalysisByIdQueryResult = NonNullable<Awaited<ReturnType<typeof getAnalysisById>>>;
export type GetAnalysisByIdQueryError = ErrorType<ErrorResponse>;
/**
 * @summary Get analysis by ID
 */
export declare function useGetAnalysisById<TData = Awaited<ReturnType<typeof getAnalysisById>>, TError = ErrorType<ErrorResponse>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getAnalysisById>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Delete an analysis
 */
export declare const getDeleteAnalysisUrl: (id: number) => string;
export declare const deleteAnalysis: (id: number, options?: RequestInit) => Promise<DeleteResponse>;
export declare const getDeleteAnalysisMutationOptions: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteAnalysis>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof deleteAnalysis>>, TError, {
    id: number;
}, TContext>;
export type DeleteAnalysisMutationResult = NonNullable<Awaited<ReturnType<typeof deleteAnalysis>>>;
export type DeleteAnalysisMutationError = ErrorType<ErrorResponse>;
/**
 * @summary Delete an analysis
 */
export declare const useDeleteAnalysis: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteAnalysis>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof deleteAnalysis>>, TError, {
    id: number;
}, TContext>;
/**
 * @summary Submit feedback for an analysis
 */
export declare const getCreateFeedbackUrl: () => string;
export declare const createFeedback: (createFeedbackRequest: CreateFeedbackRequest, options?: RequestInit) => Promise<FeedbackItem>;
export declare const getCreateFeedbackMutationOptions: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createFeedback>>, TError, {
        data: BodyType<CreateFeedbackRequest>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createFeedback>>, TError, {
    data: BodyType<CreateFeedbackRequest>;
}, TContext>;
export type CreateFeedbackMutationResult = NonNullable<Awaited<ReturnType<typeof createFeedback>>>;
export type CreateFeedbackMutationBody = BodyType<CreateFeedbackRequest>;
export type CreateFeedbackMutationError = ErrorType<ErrorResponse>;
/**
 * @summary Submit feedback for an analysis
 */
export declare const useCreateFeedback: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createFeedback>>, TError, {
        data: BodyType<CreateFeedbackRequest>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createFeedback>>, TError, {
    data: BodyType<CreateFeedbackRequest>;
}, TContext>;
/**
 * @summary Get all feedback (optionally filtered by analysis)
 */
export declare const getGetFeedbackListUrl: (params?: GetFeedbackListParams) => string;
export declare const getFeedbackList: (params?: GetFeedbackListParams, options?: RequestInit) => Promise<FeedbackListResponse>;
export declare const getGetFeedbackListQueryKey: (params?: GetFeedbackListParams) => readonly ["/api/feedback", ...GetFeedbackListParams[]];
export declare const getGetFeedbackListQueryOptions: <TData = Awaited<ReturnType<typeof getFeedbackList>>, TError = ErrorType<unknown>>(params?: GetFeedbackListParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getFeedbackList>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getFeedbackList>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetFeedbackListQueryResult = NonNullable<Awaited<ReturnType<typeof getFeedbackList>>>;
export type GetFeedbackListQueryError = ErrorType<unknown>;
/**
 * @summary Get all feedback (optionally filtered by analysis)
 */
export declare function useGetFeedbackList<TData = Awaited<ReturnType<typeof getFeedbackList>>, TError = ErrorType<unknown>>(params?: GetFeedbackListParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getFeedbackList>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Delete feedback
 */
export declare const getDeleteFeedbackUrl: (id: number) => string;
export declare const deleteFeedback: (id: number, options?: RequestInit) => Promise<DeleteResponse>;
export declare const getDeleteFeedbackMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteFeedback>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof deleteFeedback>>, TError, {
    id: number;
}, TContext>;
export type DeleteFeedbackMutationResult = NonNullable<Awaited<ReturnType<typeof deleteFeedback>>>;
export type DeleteFeedbackMutationError = ErrorType<unknown>;
/**
 * @summary Delete feedback
 */
export declare const useDeleteFeedback: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteFeedback>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof deleteFeedback>>, TError, {
    id: number;
}, TContext>;
export {};
//# sourceMappingURL=api.d.ts.map