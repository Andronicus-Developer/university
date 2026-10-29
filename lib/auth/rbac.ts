import { createClient } from "@/lib/supabase/server";
import { SystemRoleCode, PermissionCode, ScopeType } from "@/types/database.types";

/**
 * Server-side RBAC & Authorization Utilities
 * Leverages Supabase Auth session and PostgreSQL Security Definer functions.
 */

export async function getCurrentUser() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
}

export async function getUserProfile() {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return profile;
}

/**
 * Checks if the currently authenticated user has the specified system role.
 */
export async function hasRole(roleCode: SystemRoleCode): Promise<boolean> {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) return false;

  const { data, error } = await supabase.rpc("has_role", {
    p_role_code: roleCode,
    p_user_id: user.id,
  });

  if (error) {
    console.error("Error evaluating hasRole:", error);
    return false;
  }

  return Boolean(data);
}

/**
 * Checks if the currently authenticated user has the specified granular permission.
 */
export async function hasPermission(permissionCode: PermissionCode): Promise<boolean> {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) return false;

  const { data, error } = await supabase.rpc("has_permission", {
    p_permission_code: permissionCode,
    p_user_id: user.id,
  });

  if (error) {
    console.error("Error evaluating hasPermission:", error);
    return false;
  }

  return Boolean(data);
}

/**
 * Checks if the user has an assigned role scoped to a target faculty, department, offering, or cohort.
 */
export async function hasScope(
  roleCode: SystemRoleCode,
  scopeType: ScopeType,
  scopeId: string
): Promise<boolean> {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) return false;

  const { data, error } = await supabase.rpc("has_scope", {
    p_role_code: roleCode,
    p_scope_type: scopeType,
    p_scope_id: scopeId,
    p_user_id: user.id,
  });

  if (error) {
    console.error("Error evaluating hasScope:", error);
    return false;
  }

  return Boolean(data);
}

/**
 * Retrieves all active roles assigned to the current user.
 */
export async function getCurrentUserRoles() {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) return [];

  const { data, error } = await supabase.rpc("get_user_roles", {
    p_user_id: user.id,
  });

  if (error) {
    console.error("Error retrieving user roles:", error);
    return [];
  }

  return data || [];
}

/**
 * Retrieves all permissions granted to the current user.
 */
export async function getCurrentUserPermissions() {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) return [];

  const { data, error } = await supabase.rpc("get_user_permissions", {
    p_user_id: user.id,
  });

  if (error) {
    console.error("Error retrieving user permissions:", error);
    return [];
  }

  return data || [];
}

/**
 * Server guard: throws an Unauthorized error if user does not possess required role.
 */
export async function requireRole(roleCode: SystemRoleCode) {
  const allowed = await hasRole(roleCode);
  if (!allowed) {
    throw new Error(`Unauthorized: User lacks required role '${roleCode}'.`);
  }
}

/**
 * Server guard: throws an Unauthorized error if user does not possess required permission.
 */
export async function requirePermission(permissionCode: PermissionCode) {
  const allowed = await hasPermission(permissionCode);
  if (!allowed) {
    throw new Error(`Unauthorized: User lacks required permission '${permissionCode}'.`);
  }
}

