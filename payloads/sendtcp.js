(async function () {
    function sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    function read_file_to_buffer(path) {
        const SYSCALL = {
            open: 0x5n,
            read: 0x3n,
            close: 0x6n,
            stat: 0xbcn,
        };

        const O_RDONLY = 0n;

        const path_addr = alloc_string(path);
        const stat_buf = malloc(0x200n);
        if (syscall(SYSCALL.stat, path_addr, stat_buf) !== 0n) {
            throw new Error("Failed to get file stat: " + path);
        }

        const file_size = Number(read64(stat_buf + 72n));
        if (file_size <= 0) {
            throw new Error("Invalid file size: " + file_size);
        }

        const fd = syscall(SYSCALL.open, path_addr, O_RDONLY, 0n);
        if (fd < 0n) {
            throw new Error("Failed to open: " + path + " fd: " + toHex(fd));
        }

        const file_buffer = malloc(BigInt(file_size));

        try {
            const bytes_read = syscall(SYSCALL.read, fd, file_buffer, BigInt(file_size));

            if (bytes_read < 0n) {
                throw new Error("Failed to read file: " + toHex(bytes_read));
            }
            if (Number(bytes_read) !== file_size) {
                throw new Error("Incomplete read. Expected " + file_size.toString() + ", got " + bytes_read.toString());
            }
        } finally {
            syscall(SYSCALL.close, fd);
        }

        return { buffer: file_buffer, size: file_size };
    }

    async function send_payload(path) {
        await log("Trying to send \"" + path + "\" to 127.0.0.1:9021")
        const SYSCALL = {
            write: 0x4n,
            close: 0x6n,
            socket: 0x61n,
            setsockopt: 0x69n,
            connect: 0x62n,
        };

        const AF_INET = 2n;
        const SOCK_STREAM = 1n;
        const SOL_SOCKET = 0xffffn;
        const SO_REUSEADDR = 4n;

        await log("Reading payload from: " + path);
        const { buffer, size } = read_file_to_buffer(path);
        await log("Payload size: " + size.toString() + " bytes");

        await log("Creating socket ...")
        const sock_fd = syscall(SYSCALL.socket, AF_INET, SOCK_STREAM, 0n);
        if (sock_fd === 0xffffffffffffffffn) {
            throw new Error("Failed to create socket: " + toHex(sock_fd));
        }

        const sockaddr = malloc(16);
        const enable = malloc(4);

        write32(enable, 1);
        syscall(SYSCALL.setsockopt, sock_fd, SOL_SOCKET, SO_REUSEADDR, enable, 4n);

        write8(sockaddr + 1n, AF_INET);
        write16(sockaddr + 2n, 0x3D23n);
        write32(sockaddr + 4n, 0x0100007Fn);

        await log("Wait for elf loader...");
        await sleep(4000);

        await log("Connecting to elf loader...");
        const ret = syscall(SYSCALL.connect, sock_fd, sockaddr, 16n);

        if (ret === 0n) {
            syscall(SYSCALL.write, sock_fd, buffer, BigInt(size));
            syscall(SYSCALL.close, sock_fd);
            await log("Payload sent: " + size.toString() + " bytes");
        } else {
            syscall(SYSCALL.close, sock_fd);
            throw new Error("Failed to connect socket");
        }
    }

    try {
        // check_jailbroken();

        // const payload_path = "/mnt/sandbox/download/PPSA01650/cache/splash_screen/aHR0cHM6Ly93d3cueW91dHViZS5jb20vdHY=/bdj_unpatch_1320_v2.elf";
        const payload_path = "/download0/cache/splash_screen/aHR0cHM6Ly93d3cueW91dHViZS5jb20vdHY=/bdj_unpatch_1320_v2.elf";
        if (file_exists(payload_path)) {
            await send_payload(payload_path);
        } else {
            throw new Error("bdj_unpatch_v2.elf not found!");
        }
    } catch (e) {
        const msg = (e && e.message) ? e.message : String(e);
        await log("Error: " + msg);
        throw e;
    }
  })();