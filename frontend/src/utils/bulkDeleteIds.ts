export async function bulkDeleteIds(
    bulkDelete: (ids: number[]) => Promise<unknown>,
    ids: number[],
): Promise<void> {
    const batchSize = 500;
    for (let index = 0; index < ids.length; index += batchSize) {
        await bulkDelete(ids.slice(index, index + batchSize));
    }
}
