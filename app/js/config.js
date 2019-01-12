const isTestnet = false;

const config = {
    isTestnet: isTestnet,
    defaultFee: 0.00151168,
    decimalMultiplier: 100000000,
    defaultNodeUrl: isTestnet ? 'http://127.0.0.1' : 'http://40.117.196.55',
    defaultNodePort: isTestnet ? '8070' : '8080',
    configStreamName: 'publicConfigStore',
    channelStreamName: 'ChannelStore',
    retargetFrequency: isTestnet ? 12 : 2000,
    forks: isTestnet ? {two: 0, four: 12, seven:40} : {two: 9000, four: 26900, seven:28135},
    checkPointHeader: ["header", 38671, "CoyxdfjlUzd/cujJRS1iTksmE5l7C3lsyn+2FY0kxmU=", "+CwT4ZGvYE10i5Tdocj1j+ojSNowEDp+Jq+uw3zdO20=", "MrN5jt9v0X91Kix3HInDP25dNrTXOt+ux3d2yY64QMk=", 212163079, 13698, 3, "AAAAAAAAAAAAhv86dgAAAAAV79tiAAAAAAAWxwAAZjc=", 402432639143042350000, 5982],
    checkPointEwah: 2177732187806707,
    initialDifficulty: isTestnet ? 2500 : 8844,
    headersBatch: 5000,
    appTitle: "Amoveo3 Wallet",
}

module.exports = config;
