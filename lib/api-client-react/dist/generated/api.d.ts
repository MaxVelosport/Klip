import type { QueryKey, UseMutationOptions, UseMutationResult, UseQueryOptions, UseQueryResult } from "@tanstack/react-query";
import type { AddSceneRequest, AdminAnalytics, AdminUser, AuthResponse, BadRequestResponse, BrandKit, CreateProjectRequest, CurrentUser, DashboardSummary, HealthStatus, ListProjectsParams, LoginRequest, NotFoundResponse, OkResponse, Payment, PaymentConfirmation, Plan, Presets, Project, ProjectProgress, ProjectSummary, PromoCodeRequest, PromoCodeResponse, PurchaseTokensRequest, RegisterRequest, RenderJob, Scene, SubscribeRequest, UnauthorizedResponse, UpdateProfileRequest, UpdateProjectRequest, UpdateSceneRequest, UsageInfo } from "./api.schemas";
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
 * @summary Register a new user with email and password
 */
export declare const getRegisterUserUrl: () => string;
export declare const registerUser: (registerRequest: RegisterRequest, options?: RequestInit) => Promise<AuthResponse>;
export declare const getRegisterUserMutationOptions: <TError = ErrorType<BadRequestResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof registerUser>>, TError, {
        data: BodyType<RegisterRequest>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof registerUser>>, TError, {
    data: BodyType<RegisterRequest>;
}, TContext>;
export type RegisterUserMutationResult = NonNullable<Awaited<ReturnType<typeof registerUser>>>;
export type RegisterUserMutationBody = BodyType<RegisterRequest>;
export type RegisterUserMutationError = ErrorType<BadRequestResponse>;
/**
 * @summary Register a new user with email and password
 */
export declare const useRegisterUser: <TError = ErrorType<BadRequestResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof registerUser>>, TError, {
        data: BodyType<RegisterRequest>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof registerUser>>, TError, {
    data: BodyType<RegisterRequest>;
}, TContext>;
/**
 * @summary Log in with email + password
 */
export declare const getLoginUserUrl: () => string;
export declare const loginUser: (loginRequest: LoginRequest, options?: RequestInit) => Promise<AuthResponse>;
export declare const getLoginUserMutationOptions: <TError = ErrorType<UnauthorizedResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof loginUser>>, TError, {
        data: BodyType<LoginRequest>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof loginUser>>, TError, {
    data: BodyType<LoginRequest>;
}, TContext>;
export type LoginUserMutationResult = NonNullable<Awaited<ReturnType<typeof loginUser>>>;
export type LoginUserMutationBody = BodyType<LoginRequest>;
export type LoginUserMutationError = ErrorType<UnauthorizedResponse>;
/**
 * @summary Log in with email + password
 */
export declare const useLoginUser: <TError = ErrorType<UnauthorizedResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof loginUser>>, TError, {
        data: BodyType<LoginRequest>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof loginUser>>, TError, {
    data: BodyType<LoginRequest>;
}, TContext>;
/**
 * @summary Log out current session
 */
export declare const getLogoutUserUrl: () => string;
export declare const logoutUser: (options?: RequestInit) => Promise<OkResponse>;
export declare const getLogoutUserMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof logoutUser>>, TError, void, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof logoutUser>>, TError, void, TContext>;
export type LogoutUserMutationResult = NonNullable<Awaited<ReturnType<typeof logoutUser>>>;
export type LogoutUserMutationError = ErrorType<unknown>;
/**
 * @summary Log out current session
 */
export declare const useLogoutUser: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof logoutUser>>, TError, void, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof logoutUser>>, TError, void, TContext>;
/**
 * @summary Mock OAuth login (VK / Yandex)
 */
export declare const getOauthLoginUrl: (provider: "vk" | "yandex") => string;
export declare const oauthLogin: (provider: "vk" | "yandex", options?: RequestInit) => Promise<AuthResponse>;
export declare const getOauthLoginMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof oauthLogin>>, TError, {
        provider: "vk" | "yandex";
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof oauthLogin>>, TError, {
    provider: "vk" | "yandex";
}, TContext>;
export type OauthLoginMutationResult = NonNullable<Awaited<ReturnType<typeof oauthLogin>>>;
export type OauthLoginMutationError = ErrorType<unknown>;
/**
 * @summary Mock OAuth login (VK / Yandex)
 */
export declare const useOauthLogin: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof oauthLogin>>, TError, {
        provider: "vk" | "yandex";
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof oauthLogin>>, TError, {
    provider: "vk" | "yandex";
}, TContext>;
/**
 * @summary Get current user profile + balance + subscription
 */
export declare const getGetCurrentUserUrl: () => string;
export declare const getCurrentUser: (options?: RequestInit) => Promise<CurrentUser>;
export declare const getGetCurrentUserQueryKey: () => readonly ["/api/me"];
export declare const getGetCurrentUserQueryOptions: <TData = Awaited<ReturnType<typeof getCurrentUser>>, TError = ErrorType<UnauthorizedResponse>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getCurrentUser>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getCurrentUser>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetCurrentUserQueryResult = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;
export type GetCurrentUserQueryError = ErrorType<UnauthorizedResponse>;
/**
 * @summary Get current user profile + balance + subscription
 */
export declare function useGetCurrentUser<TData = Awaited<ReturnType<typeof getCurrentUser>>, TError = ErrorType<UnauthorizedResponse>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getCurrentUser>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Update profile
 */
export declare const getUpdateCurrentUserUrl: () => string;
export declare const updateCurrentUser: (updateProfileRequest: UpdateProfileRequest, options?: RequestInit) => Promise<CurrentUser>;
export declare const getUpdateCurrentUserMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateCurrentUser>>, TError, {
        data: BodyType<UpdateProfileRequest>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateCurrentUser>>, TError, {
    data: BodyType<UpdateProfileRequest>;
}, TContext>;
export type UpdateCurrentUserMutationResult = NonNullable<Awaited<ReturnType<typeof updateCurrentUser>>>;
export type UpdateCurrentUserMutationBody = BodyType<UpdateProfileRequest>;
export type UpdateCurrentUserMutationError = ErrorType<unknown>;
/**
 * @summary Update profile
 */
export declare const useUpdateCurrentUser: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateCurrentUser>>, TError, {
        data: BodyType<UpdateProfileRequest>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateCurrentUser>>, TError, {
    data: BodyType<UpdateProfileRequest>;
}, TContext>;
/**
 * @summary Get my brand kit (defaults if not set)
 */
export declare const getGetBrandKitUrl: () => string;
export declare const getBrandKit: (options?: RequestInit) => Promise<BrandKit>;
export declare const getGetBrandKitQueryKey: () => readonly ["/api/me/brand-kit"];
export declare const getGetBrandKitQueryOptions: <TData = Awaited<ReturnType<typeof getBrandKit>>, TError = ErrorType<UnauthorizedResponse>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getBrandKit>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getBrandKit>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetBrandKitQueryResult = NonNullable<Awaited<ReturnType<typeof getBrandKit>>>;
export type GetBrandKitQueryError = ErrorType<UnauthorizedResponse>;
/**
 * @summary Get my brand kit (defaults if not set)
 */
export declare function useGetBrandKit<TData = Awaited<ReturnType<typeof getBrandKit>>, TError = ErrorType<UnauthorizedResponse>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getBrandKit>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Create or update brand kit (upsert)
 */
export declare const getUpdateBrandKitUrl: () => string;
export declare const updateBrandKit: (brandKit: BrandKit, options?: RequestInit) => Promise<BrandKit>;
export declare const getUpdateBrandKitMutationOptions: <TError = ErrorType<BadRequestResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateBrandKit>>, TError, {
        data: BodyType<BrandKit>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateBrandKit>>, TError, {
    data: BodyType<BrandKit>;
}, TContext>;
export type UpdateBrandKitMutationResult = NonNullable<Awaited<ReturnType<typeof updateBrandKit>>>;
export type UpdateBrandKitMutationBody = BodyType<BrandKit>;
export type UpdateBrandKitMutationError = ErrorType<BadRequestResponse>;
/**
 * @summary Create or update brand kit (upsert)
 */
export declare const useUpdateBrandKit: <TError = ErrorType<BadRequestResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateBrandKit>>, TError, {
        data: BodyType<BrandKit>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateBrandKit>>, TError, {
    data: BodyType<BrandKit>;
}, TContext>;
/**
 * @summary Quotas and remaining videos/tokens
 */
export declare const getGetUsageUrl: () => string;
export declare const getUsage: (options?: RequestInit) => Promise<UsageInfo>;
export declare const getGetUsageQueryKey: () => readonly ["/api/me/usage"];
export declare const getGetUsageQueryOptions: <TData = Awaited<ReturnType<typeof getUsage>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getUsage>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getUsage>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetUsageQueryResult = NonNullable<Awaited<ReturnType<typeof getUsage>>>;
export type GetUsageQueryError = ErrorType<unknown>;
/**
 * @summary Quotas and remaining videos/tokens
 */
export declare function useGetUsage<TData = Awaited<ReturnType<typeof getUsage>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getUsage>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary List subscription plans
 */
export declare const getListPlansUrl: () => string;
export declare const listPlans: (options?: RequestInit) => Promise<Plan[]>;
export declare const getListPlansQueryKey: () => readonly ["/api/plans"];
export declare const getListPlansQueryOptions: <TData = Awaited<ReturnType<typeof listPlans>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listPlans>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listPlans>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListPlansQueryResult = NonNullable<Awaited<ReturnType<typeof listPlans>>>;
export type ListPlansQueryError = ErrorType<unknown>;
/**
 * @summary List subscription plans
 */
export declare function useListPlans<TData = Awaited<ReturnType<typeof listPlans>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listPlans>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Subscribe to plan (mock — returns confirmation_url)
 */
export declare const getSubscribeToPlanUrl: () => string;
export declare const subscribeToPlan: (subscribeRequest: SubscribeRequest, options?: RequestInit) => Promise<PaymentConfirmation>;
export declare const getSubscribeToPlanMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof subscribeToPlan>>, TError, {
        data: BodyType<SubscribeRequest>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof subscribeToPlan>>, TError, {
    data: BodyType<SubscribeRequest>;
}, TContext>;
export type SubscribeToPlanMutationResult = NonNullable<Awaited<ReturnType<typeof subscribeToPlan>>>;
export type SubscribeToPlanMutationBody = BodyType<SubscribeRequest>;
export type SubscribeToPlanMutationError = ErrorType<unknown>;
/**
 * @summary Subscribe to plan (mock — returns confirmation_url)
 */
export declare const useSubscribeToPlan: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof subscribeToPlan>>, TError, {
        data: BodyType<SubscribeRequest>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof subscribeToPlan>>, TError, {
    data: BodyType<SubscribeRequest>;
}, TContext>;
/**
 * @summary Purchase token pack (mock — instantly credits balance)
 */
export declare const getPurchaseTokensUrl: () => string;
export declare const purchaseTokens: (purchaseTokensRequest: PurchaseTokensRequest, options?: RequestInit) => Promise<PaymentConfirmation>;
export declare const getPurchaseTokensMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof purchaseTokens>>, TError, {
        data: BodyType<PurchaseTokensRequest>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof purchaseTokens>>, TError, {
    data: BodyType<PurchaseTokensRequest>;
}, TContext>;
export type PurchaseTokensMutationResult = NonNullable<Awaited<ReturnType<typeof purchaseTokens>>>;
export type PurchaseTokensMutationBody = BodyType<PurchaseTokensRequest>;
export type PurchaseTokensMutationError = ErrorType<unknown>;
/**
 * @summary Purchase token pack (mock — instantly credits balance)
 */
export declare const usePurchaseTokens: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof purchaseTokens>>, TError, {
        data: BodyType<PurchaseTokensRequest>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof purchaseTokens>>, TError, {
    data: BodyType<PurchaseTokensRequest>;
}, TContext>;
/**
 * @summary Cancel subscription at period end
 */
export declare const getCancelSubscriptionUrl: () => string;
export declare const cancelSubscription: (options?: RequestInit) => Promise<OkResponse>;
export declare const getCancelSubscriptionMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof cancelSubscription>>, TError, void, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof cancelSubscription>>, TError, void, TContext>;
export type CancelSubscriptionMutationResult = NonNullable<Awaited<ReturnType<typeof cancelSubscription>>>;
export type CancelSubscriptionMutationError = ErrorType<unknown>;
/**
 * @summary Cancel subscription at period end
 */
export declare const useCancelSubscription: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof cancelSubscription>>, TError, void, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof cancelSubscription>>, TError, void, TContext>;
/**
 * @summary Payment history
 */
export declare const getListPaymentsUrl: () => string;
export declare const listPayments: (options?: RequestInit) => Promise<Payment[]>;
export declare const getListPaymentsQueryKey: () => readonly ["/api/billing/payments"];
export declare const getListPaymentsQueryOptions: <TData = Awaited<ReturnType<typeof listPayments>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listPayments>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listPayments>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListPaymentsQueryResult = NonNullable<Awaited<ReturnType<typeof listPayments>>>;
export type ListPaymentsQueryError = ErrorType<unknown>;
/**
 * @summary Payment history
 */
export declare function useListPayments<TData = Awaited<ReturnType<typeof listPayments>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listPayments>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Redeem promo code (adds tokens or discount note)
 */
export declare const getRedeemPromoCodeUrl: () => string;
export declare const redeemPromoCode: (promoCodeRequest: PromoCodeRequest, options?: RequestInit) => Promise<PromoCodeResponse>;
export declare const getRedeemPromoCodeMutationOptions: <TError = ErrorType<BadRequestResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof redeemPromoCode>>, TError, {
        data: BodyType<PromoCodeRequest>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof redeemPromoCode>>, TError, {
    data: BodyType<PromoCodeRequest>;
}, TContext>;
export type RedeemPromoCodeMutationResult = NonNullable<Awaited<ReturnType<typeof redeemPromoCode>>>;
export type RedeemPromoCodeMutationBody = BodyType<PromoCodeRequest>;
export type RedeemPromoCodeMutationError = ErrorType<BadRequestResponse>;
/**
 * @summary Redeem promo code (adds tokens or discount note)
 */
export declare const useRedeemPromoCode: <TError = ErrorType<BadRequestResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof redeemPromoCode>>, TError, {
        data: BodyType<PromoCodeRequest>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof redeemPromoCode>>, TError, {
    data: BodyType<PromoCodeRequest>;
}, TContext>;
/**
 * @summary List my projects
 */
export declare const getListProjectsUrl: (params?: ListProjectsParams) => string;
export declare const listProjects: (params?: ListProjectsParams, options?: RequestInit) => Promise<ProjectSummary[]>;
export declare const getListProjectsQueryKey: (params?: ListProjectsParams) => readonly ["/api/projects", ...ListProjectsParams[]];
export declare const getListProjectsQueryOptions: <TData = Awaited<ReturnType<typeof listProjects>>, TError = ErrorType<unknown>>(params?: ListProjectsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listProjects>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listProjects>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListProjectsQueryResult = NonNullable<Awaited<ReturnType<typeof listProjects>>>;
export type ListProjectsQueryError = ErrorType<unknown>;
/**
 * @summary List my projects
 */
export declare function useListProjects<TData = Awaited<ReturnType<typeof listProjects>>, TError = ErrorType<unknown>>(params?: ListProjectsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listProjects>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Create draft project (Step 1)
 */
export declare const getCreateProjectUrl: () => string;
export declare const createProject: (createProjectRequest: CreateProjectRequest, options?: RequestInit) => Promise<Project>;
export declare const getCreateProjectMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createProject>>, TError, {
        data: BodyType<CreateProjectRequest>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createProject>>, TError, {
    data: BodyType<CreateProjectRequest>;
}, TContext>;
export type CreateProjectMutationResult = NonNullable<Awaited<ReturnType<typeof createProject>>>;
export type CreateProjectMutationBody = BodyType<CreateProjectRequest>;
export type CreateProjectMutationError = ErrorType<unknown>;
/**
 * @summary Create draft project (Step 1)
 */
export declare const useCreateProject: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createProject>>, TError, {
        data: BodyType<CreateProjectRequest>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createProject>>, TError, {
    data: BodyType<CreateProjectRequest>;
}, TContext>;
/**
 * @summary Get project with scenes
 */
export declare const getGetProjectUrl: (id: string) => string;
export declare const getProject: (id: string, options?: RequestInit) => Promise<Project>;
export declare const getGetProjectQueryKey: (id: string) => readonly [`/api/projects/${string}`];
export declare const getGetProjectQueryOptions: <TData = Awaited<ReturnType<typeof getProject>>, TError = ErrorType<NotFoundResponse>>(id: string, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getProject>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getProject>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetProjectQueryResult = NonNullable<Awaited<ReturnType<typeof getProject>>>;
export type GetProjectQueryError = ErrorType<NotFoundResponse>;
/**
 * @summary Get project with scenes
 */
export declare function useGetProject<TData = Awaited<ReturnType<typeof getProject>>, TError = ErrorType<NotFoundResponse>>(id: string, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getProject>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Update project metadata or step
 */
export declare const getUpdateProjectUrl: (id: string) => string;
export declare const updateProject: (id: string, updateProjectRequest: UpdateProjectRequest, options?: RequestInit) => Promise<Project>;
export declare const getUpdateProjectMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateProject>>, TError, {
        id: string;
        data: BodyType<UpdateProjectRequest>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateProject>>, TError, {
    id: string;
    data: BodyType<UpdateProjectRequest>;
}, TContext>;
export type UpdateProjectMutationResult = NonNullable<Awaited<ReturnType<typeof updateProject>>>;
export type UpdateProjectMutationBody = BodyType<UpdateProjectRequest>;
export type UpdateProjectMutationError = ErrorType<unknown>;
/**
 * @summary Update project metadata or step
 */
export declare const useUpdateProject: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateProject>>, TError, {
        id: string;
        data: BodyType<UpdateProjectRequest>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateProject>>, TError, {
    id: string;
    data: BodyType<UpdateProjectRequest>;
}, TContext>;
/**
 * @summary Soft-delete a project
 */
export declare const getDeleteProjectUrl: (id: string) => string;
export declare const deleteProject: (id: string, options?: RequestInit) => Promise<OkResponse>;
export declare const getDeleteProjectMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteProject>>, TError, {
        id: string;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof deleteProject>>, TError, {
    id: string;
}, TContext>;
export type DeleteProjectMutationResult = NonNullable<Awaited<ReturnType<typeof deleteProject>>>;
export type DeleteProjectMutationError = ErrorType<unknown>;
/**
 * @summary Soft-delete a project
 */
export declare const useDeleteProject: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteProject>>, TError, {
        id: string;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof deleteProject>>, TError, {
    id: string;
}, TContext>;
/**
 * @summary Duplicate project
 */
export declare const getDuplicateProjectUrl: (id: string) => string;
export declare const duplicateProject: (id: string, options?: RequestInit) => Promise<Project>;
export declare const getDuplicateProjectMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof duplicateProject>>, TError, {
        id: string;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof duplicateProject>>, TError, {
    id: string;
}, TContext>;
export type DuplicateProjectMutationResult = NonNullable<Awaited<ReturnType<typeof duplicateProject>>>;
export type DuplicateProjectMutationError = ErrorType<unknown>;
/**
 * @summary Duplicate project
 */
export declare const useDuplicateProject: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof duplicateProject>>, TError, {
        id: string;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof duplicateProject>>, TError, {
    id: string;
}, TContext>;
/**
 * @summary Add a scene
 */
export declare const getAddSceneUrl: (id: string) => string;
export declare const addScene: (id: string, addSceneRequest: AddSceneRequest, options?: RequestInit) => Promise<Scene>;
export declare const getAddSceneMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof addScene>>, TError, {
        id: string;
        data: BodyType<AddSceneRequest>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof addScene>>, TError, {
    id: string;
    data: BodyType<AddSceneRequest>;
}, TContext>;
export type AddSceneMutationResult = NonNullable<Awaited<ReturnType<typeof addScene>>>;
export type AddSceneMutationBody = BodyType<AddSceneRequest>;
export type AddSceneMutationError = ErrorType<unknown>;
/**
 * @summary Add a scene
 */
export declare const useAddScene: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof addScene>>, TError, {
        id: string;
        data: BodyType<AddSceneRequest>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof addScene>>, TError, {
    id: string;
    data: BodyType<AddSceneRequest>;
}, TContext>;
/**
 * @summary Update a scene
 */
export declare const getUpdateSceneUrl: (id: string, sceneId: string) => string;
export declare const updateScene: (id: string, sceneId: string, updateSceneRequest: UpdateSceneRequest, options?: RequestInit) => Promise<Scene>;
export declare const getUpdateSceneMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateScene>>, TError, {
        id: string;
        sceneId: string;
        data: BodyType<UpdateSceneRequest>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateScene>>, TError, {
    id: string;
    sceneId: string;
    data: BodyType<UpdateSceneRequest>;
}, TContext>;
export type UpdateSceneMutationResult = NonNullable<Awaited<ReturnType<typeof updateScene>>>;
export type UpdateSceneMutationBody = BodyType<UpdateSceneRequest>;
export type UpdateSceneMutationError = ErrorType<unknown>;
/**
 * @summary Update a scene
 */
export declare const useUpdateScene: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateScene>>, TError, {
        id: string;
        sceneId: string;
        data: BodyType<UpdateSceneRequest>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateScene>>, TError, {
    id: string;
    sceneId: string;
    data: BodyType<UpdateSceneRequest>;
}, TContext>;
/**
 * @summary Delete a scene
 */
export declare const getDeleteSceneUrl: (id: string, sceneId: string) => string;
export declare const deleteScene: (id: string, sceneId: string, options?: RequestInit) => Promise<OkResponse>;
export declare const getDeleteSceneMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteScene>>, TError, {
        id: string;
        sceneId: string;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof deleteScene>>, TError, {
    id: string;
    sceneId: string;
}, TContext>;
export type DeleteSceneMutationResult = NonNullable<Awaited<ReturnType<typeof deleteScene>>>;
export type DeleteSceneMutationError = ErrorType<unknown>;
/**
 * @summary Delete a scene
 */
export declare const useDeleteScene: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteScene>>, TError, {
        id: string;
        sceneId: string;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof deleteScene>>, TError, {
    id: string;
    sceneId: string;
}, TContext>;
/**
 * @summary Regenerate image for a scene (mock)
 */
export declare const getRegenerateSceneImageUrl: (id: string, sceneId: string) => string;
export declare const regenerateSceneImage: (id: string, sceneId: string, options?: RequestInit) => Promise<Scene>;
export declare const getRegenerateSceneImageMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof regenerateSceneImage>>, TError, {
        id: string;
        sceneId: string;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof regenerateSceneImage>>, TError, {
    id: string;
    sceneId: string;
}, TContext>;
export type RegenerateSceneImageMutationResult = NonNullable<Awaited<ReturnType<typeof regenerateSceneImage>>>;
export type RegenerateSceneImageMutationError = ErrorType<unknown>;
/**
 * @summary Regenerate image for a scene (mock)
 */
export declare const useRegenerateSceneImage: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof regenerateSceneImage>>, TError, {
        id: string;
        sceneId: string;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof regenerateSceneImage>>, TError, {
    id: string;
    sceneId: string;
}, TContext>;
/**
 * @summary Run AI script generation (mock)
 */
export declare const getGenerateScriptUrl: (id: string) => string;
export declare const generateScript: (id: string, options?: RequestInit) => Promise<Project>;
export declare const getGenerateScriptMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof generateScript>>, TError, {
        id: string;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof generateScript>>, TError, {
    id: string;
}, TContext>;
export type GenerateScriptMutationResult = NonNullable<Awaited<ReturnType<typeof generateScript>>>;
export type GenerateScriptMutationError = ErrorType<unknown>;
/**
 * @summary Run AI script generation (mock)
 */
export declare const useGenerateScript: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof generateScript>>, TError, {
        id: string;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof generateScript>>, TError, {
    id: string;
}, TContext>;
/**
 * @summary Run AI image generation (mock)
 */
export declare const getGenerateImagesUrl: (id: string) => string;
export declare const generateImages: (id: string, options?: RequestInit) => Promise<Project>;
export declare const getGenerateImagesMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof generateImages>>, TError, {
        id: string;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof generateImages>>, TError, {
    id: string;
}, TContext>;
export type GenerateImagesMutationResult = NonNullable<Awaited<ReturnType<typeof generateImages>>>;
export type GenerateImagesMutationError = ErrorType<unknown>;
/**
 * @summary Run AI image generation (mock)
 */
export declare const useGenerateImages: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof generateImages>>, TError, {
        id: string;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof generateImages>>, TError, {
    id: string;
}, TContext>;
/**
 * @summary Run TTS audio generation (mock)
 */
export declare const getGenerateAudioUrl: (id: string) => string;
export declare const generateAudio: (id: string, options?: RequestInit) => Promise<Project>;
export declare const getGenerateAudioMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof generateAudio>>, TError, {
        id: string;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof generateAudio>>, TError, {
    id: string;
}, TContext>;
export type GenerateAudioMutationResult = NonNullable<Awaited<ReturnType<typeof generateAudio>>>;
export type GenerateAudioMutationError = ErrorType<unknown>;
/**
 * @summary Run TTS audio generation (mock)
 */
export declare const useGenerateAudio: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof generateAudio>>, TError, {
        id: string;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof generateAudio>>, TError, {
    id: string;
}, TContext>;
/**
 * @summary Run final render (mock — instantly produces video URL)
 */
export declare const getRenderVideoUrl: (id: string) => string;
export declare const renderVideo: (id: string, options?: RequestInit) => Promise<Project>;
export declare const getRenderVideoMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof renderVideo>>, TError, {
        id: string;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof renderVideo>>, TError, {
    id: string;
}, TContext>;
export type RenderVideoMutationResult = NonNullable<Awaited<ReturnType<typeof renderVideo>>>;
export type RenderVideoMutationError = ErrorType<unknown>;
/**
 * @summary Run final render (mock — instantly produces video URL)
 */
export declare const useRenderVideo: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof renderVideo>>, TError, {
        id: string;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof renderVideo>>, TError, {
    id: string;
}, TContext>;
/**
 * @summary Get current render progress
 */
export declare const getGetProjectProgressUrl: (id: string) => string;
export declare const getProjectProgress: (id: string, options?: RequestInit) => Promise<ProjectProgress>;
export declare const getGetProjectProgressQueryKey: (id: string) => readonly [`/api/projects/${string}/progress`];
export declare const getGetProjectProgressQueryOptions: <TData = Awaited<ReturnType<typeof getProjectProgress>>, TError = ErrorType<unknown>>(id: string, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getProjectProgress>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getProjectProgress>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetProjectProgressQueryResult = NonNullable<Awaited<ReturnType<typeof getProjectProgress>>>;
export type GetProjectProgressQueryError = ErrorType<unknown>;
/**
 * @summary Get current render progress
 */
export declare function useGetProjectProgress<TData = Awaited<ReturnType<typeof getProjectProgress>>, TError = ErrorType<unknown>>(id: string, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getProjectProgress>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Dashboard summary (totals, status counts, recent activity)
 */
export declare const getGetDashboardSummaryUrl: () => string;
export declare const getDashboardSummary: (options?: RequestInit) => Promise<DashboardSummary>;
export declare const getGetDashboardSummaryQueryKey: () => readonly ["/api/dashboard/summary"];
export declare const getGetDashboardSummaryQueryOptions: <TData = Awaited<ReturnType<typeof getDashboardSummary>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getDashboardSummary>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getDashboardSummary>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetDashboardSummaryQueryResult = NonNullable<Awaited<ReturnType<typeof getDashboardSummary>>>;
export type GetDashboardSummaryQueryError = ErrorType<unknown>;
/**
 * @summary Dashboard summary (totals, status counts, recent activity)
 */
export declare function useGetDashboardSummary<TData = Awaited<ReturnType<typeof getDashboardSummary>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getDashboardSummary>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Lists voice / animation / music / style presets
 */
export declare const getListPresetsUrl: () => string;
export declare const listPresets: (options?: RequestInit) => Promise<Presets>;
export declare const getListPresetsQueryKey: () => readonly ["/api/presets"];
export declare const getListPresetsQueryOptions: <TData = Awaited<ReturnType<typeof listPresets>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listPresets>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listPresets>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListPresetsQueryResult = NonNullable<Awaited<ReturnType<typeof listPresets>>>;
export type ListPresetsQueryError = ErrorType<unknown>;
/**
 * @summary Lists voice / animation / music / style presets
 */
export declare function useListPresets<TData = Awaited<ReturnType<typeof listPresets>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listPresets>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Admin — list users
 */
export declare const getAdminListUsersUrl: () => string;
export declare const adminListUsers: (options?: RequestInit) => Promise<AdminUser[]>;
export declare const getAdminListUsersQueryKey: () => readonly ["/api/admin/users"];
export declare const getAdminListUsersQueryOptions: <TData = Awaited<ReturnType<typeof adminListUsers>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof adminListUsers>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof adminListUsers>>, TError, TData> & {
    queryKey: QueryKey;
};
export type AdminListUsersQueryResult = NonNullable<Awaited<ReturnType<typeof adminListUsers>>>;
export type AdminListUsersQueryError = ErrorType<unknown>;
/**
 * @summary Admin — list users
 */
export declare function useAdminListUsers<TData = Awaited<ReturnType<typeof adminListUsers>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof adminListUsers>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Admin — render queue
 */
export declare const getAdminListJobsUrl: () => string;
export declare const adminListJobs: (options?: RequestInit) => Promise<RenderJob[]>;
export declare const getAdminListJobsQueryKey: () => readonly ["/api/admin/jobs"];
export declare const getAdminListJobsQueryOptions: <TData = Awaited<ReturnType<typeof adminListJobs>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof adminListJobs>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof adminListJobs>>, TError, TData> & {
    queryKey: QueryKey;
};
export type AdminListJobsQueryResult = NonNullable<Awaited<ReturnType<typeof adminListJobs>>>;
export type AdminListJobsQueryError = ErrorType<unknown>;
/**
 * @summary Admin — render queue
 */
export declare function useAdminListJobs<TData = Awaited<ReturnType<typeof adminListJobs>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof adminListJobs>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Admin — retry a render job
 */
export declare const getAdminRetryJobUrl: (jobId: string) => string;
export declare const adminRetryJob: (jobId: string, options?: RequestInit) => Promise<RenderJob>;
export declare const getAdminRetryJobMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof adminRetryJob>>, TError, {
        jobId: string;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof adminRetryJob>>, TError, {
    jobId: string;
}, TContext>;
export type AdminRetryJobMutationResult = NonNullable<Awaited<ReturnType<typeof adminRetryJob>>>;
export type AdminRetryJobMutationError = ErrorType<unknown>;
/**
 * @summary Admin — retry a render job
 */
export declare const useAdminRetryJob: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof adminRetryJob>>, TError, {
        jobId: string;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof adminRetryJob>>, TError, {
    jobId: string;
}, TContext>;
/**
 * @summary Admin — analytics overview
 */
export declare const getAdminGetAnalyticsUrl: () => string;
export declare const adminGetAnalytics: (options?: RequestInit) => Promise<AdminAnalytics>;
export declare const getAdminGetAnalyticsQueryKey: () => readonly ["/api/admin/analytics"];
export declare const getAdminGetAnalyticsQueryOptions: <TData = Awaited<ReturnType<typeof adminGetAnalytics>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof adminGetAnalytics>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof adminGetAnalytics>>, TError, TData> & {
    queryKey: QueryKey;
};
export type AdminGetAnalyticsQueryResult = NonNullable<Awaited<ReturnType<typeof adminGetAnalytics>>>;
export type AdminGetAnalyticsQueryError = ErrorType<unknown>;
/**
 * @summary Admin — analytics overview
 */
export declare function useAdminGetAnalytics<TData = Awaited<ReturnType<typeof adminGetAnalytics>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof adminGetAnalytics>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export {};
//# sourceMappingURL=api.d.ts.map