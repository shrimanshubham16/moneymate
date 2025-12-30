import * as db from "./supabase-db";

/**
 * Get all user IDs in a merged finance group for the given user
 * Including the user themselves
 */
export async function getMergedFinanceGroupUserIds(userId: string): Promise<string[]> {
    const userIds = new Set<string>([userId]);

    // Get all shared accounts for this user
    const sharedAccounts = await db.getSharedAccountsByUserId(userId);
    
    // For each shared account, get all members with mergeFinances
    for (const account of sharedAccounts) {
        const members = await db.getSharedMembersByAccountId(account.id);
        const mergedMembers = members.filter(m => m.mergeFinances === true);
        mergedMembers.forEach(m => userIds.add(m.userId));
    }

    return Array.from(userIds);
}

/**
 * Check if a user has merged finances enabled
 */
export async function hasMergedFinances(userId: string): Promise<boolean> {
    const groupIds = await getMergedFinanceGroupUserIds(userId);
    return groupIds.length > 1; // More than just the user themselves
}

/**
 * Get all usernames in a merged finance group
 */
export async function getMergedFinanceGroupUsernames(userId: string): Promise<string[]> {
    const userIds = await getMergedFinanceGroupUserIds(userId);
    
    // Fetch usernames from database
    const usernames: string[] = [];
    for (const id of userIds) {
        const user = await db.getUserById(id);
        if (user?.username) {
            usernames.push(user.username);
        }
    }
    
    return usernames;
}
