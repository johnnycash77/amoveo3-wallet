const mainnet = {
    isTestnet: false,
    defaultFee: 0.00151168,
    decimalMultiplier: 100000000,
	priceMultiplier: 10000,
    defaultNodeUrl: "https://amoveobook-api.herokuapp.com/api/v1/node/",
    retargetFrequency: 2000,
    forks: {two: 9000, four: 26900, seven:28135},
    checkPointHeader: ["header", 38671, "CoyxdfjlUzd/cujJRS1iTksmE5l7C3lsyn+2FY0kxmU=", "+CwT4ZGvYE10i5Tdocj1j+ojSNowEDp+Jq+uw3zdO20=", "MrN5jt9v0X91Kix3HInDP25dNrTXOt+ux3d2yY64QMk=", 212163079, 13698, 3, "AAAAAAAAAAAAhv86dgAAAAAV79tiAAAAAAAWxwAAZjc=", 402432639143042350000, 5982],
    checkPointEwah: 2177732187806707,
    initialDifficulty: 8844,
    headersBatch: 5000,
    appTitle: "Amoveo3 Wallet",
}

const testnet = {
    isTestnet: true,
    defaultFee: 0.00151168,
    decimalMultiplier: 100000000,
    priceMultiplier: 10000,
    defaultNodeUrl: "http://amoveobook-api.herokuapp.com/api/v1/testnet/node/",
    retargetFrequency: 12,
    forks: {two: 0, four: 12, seven:40},
    checkPointHeader: ["header", 50,"avmTCvhW62I5b1ZKW/k+hN5VkDTRBUfNOML1IbDeBEM=","HtCW+xejEr+hVx9EU/YWqjkToHfB65LznX/7kYY1qYc=","/nky29gffL519fIShxYtlGYrSl/VvYYSw0Qk2F/+Q4k=",283297347,4861,0,"AAAAAAAAAAAAoAC51HYeqD+RjyH1Ew1tdebVT3/BD6g=",1006239072,746],
	checkPointEwah: 713104,
    initialDifficulty: 2500,
    headersBatch: 5000,
    appTitle: "Amoveo3 Wallet",
}

const config = {
    "mainnet": mainnet,
    "testnet": testnet,
	defaultFee: 0.00151168,
	decimalMultiplier: 100000000,
	appTitle: "Amoveo3 Wallet",
}

module.exports = config;
