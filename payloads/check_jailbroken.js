(async function () {
    if (is_jailbroken()) {
        await log('is jailbroken');
    } else {
        await log('not jailbroken');
    }
  })();