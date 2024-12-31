
export default () => {

    const getVersions = async <VersionsResponse>() => {
        return await useFetch<VersionsResponse>("/api/versions");
    };

    return { getVersions};
}