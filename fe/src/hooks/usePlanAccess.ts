'use client';

import { useAppSelector } from '@/slices/hooks';
import {
  allowedTemplates,
  canUseApp,
  canUseAdvancedDashboard,
  canUseCrm,
  canUseCustomDashboard,
  canUseFeature,
  canUseRecurringStatements,
  canUseTemplate,
  dashboardTier,
  getPlanLimit,
  hasFullTrialAccess,
  needsUpgrade,
  planRestrictionMessage,
} from '@/lib/plan-access';

export function usePlanAccess() {
  const authUser = useAppSelector((state) => state.auth.authUser);

  return {
    user: authUser,
    canUseApp: canUseApp(authUser),
    hasFullTrialAccess: hasFullTrialAccess(authUser?.subscription),
    needsUpgrade: needsUpgrade(authUser),
    restrictionMessage: planRestrictionMessage(authUser),
    canUseFeature: (featureKey: string) => canUseFeature(authUser, featureKey),
    getPlanLimit: (limitKey: string) => getPlanLimit(authUser, limitKey),
    allowedTemplates: allowedTemplates(authUser),
    canUseTemplate: (key: string) => canUseTemplate(authUser, key),
    dashboardTier: dashboardTier(authUser),
    canUseAdvancedDashboard: canUseAdvancedDashboard(authUser),
    canUseCustomDashboard: canUseCustomDashboard(authUser),
    canUseRecurringStatements: canUseRecurringStatements(authUser),
    canUseCrm: canUseCrm(authUser),
  };
}
