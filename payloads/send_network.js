(async function () {
    try {
        check_jailbroken();

        // const payload_path = "/mnt/sandbox/download/PPSA01650/cache/splash_screen/aHR0cHM6Ly93d3cueW91dHViZS5jb20vdHY=/bdj_unpatch_1320_v2.elf";
        const payload_path = "/download0/cache/splash_screen/aHR0cHM6Ly93d3cueW91dHViZS5jb20vdHY=/bdj_unpatch_1320_v2.elf";
        if (file_exists(payload_path)) {
            const file_data = await read_file(payload_path);
            if (!file_data) {
                throw new Error("Failed to read bdj_unpatch_v2.elf");
            }

            await send_network("127.0.0.1", 9021, SOCK_STREAM, file_data);
        } else {
            throw new Error("bdj_unpatch_v2.elf not found!");
        }
    } catch (e) {
        const msg = (e && e.message) ? e.message : String(e);
        await log("Error: " + msg);
        throw e;
    }
  })();