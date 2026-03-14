export default () => {
    const storeAccessKey = (accessKey: string) => {
        // Check if the access key is valid
        if(import.meta.client){
            if (!accessKey) {
                console.error("Invalid access key provided.");
                return;
            }
            // // Check if the access key is already stored in localStorage
            // const existingAccessKey = localStorage.getItem("accessKey");
            // if (existingAccessKey) {
            //     console.warn("Access key already exists. It will be overwritten.");
            // }
            // encrypt the access key before storing it
            const encryptedAccessKey = btoa(accessKey); 

            // Store the access key in localStorage
            localStorage.setItem("ิbunredmine_accesskey", encryptedAccessKey);
            console.log("Access key saved:");
        }
    }

    const retriveAccessKey = () => {
        if(import.meta.client){
            // Retrieve the access key from localStorage
            const accessKey = localStorage.getItem("ิbunredmine_accesskey");
            if (!accessKey) {
                console.error("No access key found in localStorage.");
                return null;
            }
            // Decrypt the access key before returning it
            //const decryptedAccessKey = atob(accessKey); 
            return accessKey;
        }
    }

    const removeAccessKey = () => {
        if(import.meta.client){
            // Remove the access key from localStorage
            localStorage.removeItem("ิbunredmine_accesskey");
            console.log("Access key removed from localStorage.");
        }
    }

    const decryptedAccessKey = (accessKey: string) => {
        const decryptedAccessKey = atob(accessKey); 
        return decryptedAccessKey;
    }


    return {
        storeAccessKey,
        retriveAccessKey,
        removeAccessKey,
        decryptedAccessKey
    };
};