import { getStore } from "./store";

/**
 * Get all user IDs in a merged finance group for the given user
 * Including the user themselves
 */
export function getMergedFinanceGroupUserIds(userId: string): string[] {
    const store = getStore();
    const userIds = new Set<string>([userId]);

    // Find all shared members where this user is involved with mergeFinances = true
    const memberships = store.sharedMembers.filter(
        m => m.userId === userId && m.mergeFinances === true
    );

    // For each shared account, get all members with mergeFinances
    memberships.forEach(membership => {
        const accountMembers = store.sharedMembers.filter(
            m => m.sharedAccountId === membership.sharedAccountId && m.mergeFinances === true
        );
        accountMembers.forEach(m => userIds.add(m.userId));
    });

    return Array.from(userIds);
}

/**
 * Check if a user has merged finances enabled
 */
export function hasMergedFinances(userId: string): boolean {
    const groupIds = getMergedFinanceGroupUserIds(userId);
    return groupIds.length > 1; // More than just the user themselves
}

/**
 * Get all usernames in a merged finance group
 */
export function getMergedFinanceGroupUsernames(userId: string): string[] {
    const store = getStore();
    const userIds = getMergedFinanceGroupUserIds(userId);

    return userIds
        .map(id => store.users.find(u => u.id === id)?.username)
        .filter((username): username is string => username !== undefined);
}
