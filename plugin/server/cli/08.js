    { name: "GetStarsTransactionsByID", constructorId: 768218808, argsConfig: { flags: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: true, type: null, useVectorId: null }, ton: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 0, flagIndicator: false, type: "true", useVectorId: null }, peer: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputPeer", useVectorId: null }, id: { isVector: true, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputStarsTransaction", useVectorId: true } }, subclassOfId: 1855724911, result: "payments.StarsStatus", isFunction: true, namespace: "payments" },
    { name: "GetStarsGiftOptions", constructorId: 3553192904, argsConfig: { flags: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: true, type: null, useVectorId: null }, userId: { isVector: false, isFlag: true, skipConstructorId: false, flagName: "flags", flagIndex: 0, flagIndicator: false, type: "InputUser", useVectorId: null } }, subclassOfId: 3919820757, result: "Vector<StarsGiftOption>", isFunction: true, namespace: "payments" },
    { name: "GetStarsSubscriptions", constructorId: 52761285, argsConfig: { flags: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: true, type: null, useVectorId: null }, missingBalance: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 0, flagIndicator: false, type: "true", useVectorId: null }, peer: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputPeer", useVectorId: null }, offset: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "string", useVectorId: null } }, subclassOfId: 1855724911, result: "payments.StarsStatus", isFunction: true, namespace: "payments" },
    { name: "ChangeStarsSubscription", constructorId: 3346466936, argsConfig: { flags: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: true, type: null, useVectorId: null }, peer: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputPeer", useVectorId: null }, subscriptionId: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "string", useVectorId: null }, canceled: { isVector: false, isFlag: true, skipConstructorId: false, flagName: "flags", flagIndex: 0, flagIndicator: false, type: "Bool", useVectorId: null } }, subclassOfId: 4122188204, result: "Bool", isFunction: true, namespace: "payments" },
    { name: "FulfillStarsSubscription", constructorId: 3428576179, argsConfig: { peer: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputPeer", useVectorId: null }, subscriptionId: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "string", useVectorId: null } }, subclassOfId: 4122188204, result: "Bool", isFunction: true, namespace: "payments" },
    { name: "GetStarsGiveawayOptions", constructorId: 3172924734, argsConfig: {}, subclassOfId: 4175114409, result: "Vector<StarsGiveawayOption>", isFunction: true, namespace: "payments" },
    { name: "GetStarGifts", constructorId: 3293984144, argsConfig: { hash: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "int", useVectorId: null } }, subclassOfId: 1635309988, result: "payments.StarGifts", isFunction: true, namespace: "payments" },
    { name: "SaveStarGift", constructorId: 707422588, argsConfig: { flags: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: true, type: null, useVectorId: null }, unsave: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 0, flagIndicator: false, type: "true", useVectorId: null }, stargift: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputSavedStarGift", useVectorId: null } }, subclassOfId: 4122188204, result: "Bool", isFunction: true, namespace: "payments" },
    { name: "ConvertStarGift", constructorId: 1958676331, argsConfig: { stargift: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputSavedStarGift", useVectorId: null } }, subclassOfId: 4122188204, result: "Bool", isFunction: true, namespace: "payments" },
    { name: "BotCancelStarsSubscription", constructorId: 1845102114, argsConfig: { flags: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: true, type: null, useVectorId: null }, restore: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 0, flagIndicator: false, type: "true", useVectorId: null }, userId: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputUser", useVectorId: null }, chargeId: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "string", useVectorId: null } }, subclassOfId: 4122188204, result: "Bool", isFunction: true, namespace: "payments" },
    { name: "GetConnectedStarRefBots", constructorId: 1483318611, argsConfig: { flags: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: true, type: null, useVectorId: null }, peer: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputPeer", useVectorId: null }, offsetDate: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 2, flagIndicator: false, type: "int", useVectorId: null }, offsetLink: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 2, flagIndicator: false, type: "string", useVectorId: null }, limit: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "int", useVectorId: null } }, subclassOfId: 593369703, result: "payments.ConnectedStarRefBots", isFunction: true, namespace: "payments" },
    { name: "GetConnectedStarRefBot", constructorId: 3084490992, argsConfig: { peer: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputPeer", useVectorId: null }, bot: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputUser", useVectorId: null } }, subclassOfId: 593369703, result: "payments.ConnectedStarRefBots", isFunction: true, namespace: "payments" },
    { name: "GetSuggestedStarRefBots", constructorId: 225134839, argsConfig: { flags: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: true, type: null, useVectorId: null }, orderByRevenue: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 0, flagIndicator: false, type: "true", useVectorId: null }, orderByDate: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 1, flagIndicator: false, type: "true", useVectorId: null }, peer: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputPeer", useVectorId: null }, offset: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "string", useVectorId: null }, limit: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "int", useVectorId: null } }, subclassOfId: 1880658499, result: "payments.SuggestedStarRefBots", isFunction: true, namespace: "payments" },
    { name: "ConnectStarRefBot", constructorId: 2127901834, argsConfig: { peer: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputPeer", useVectorId: null }, bot: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputUser", useVectorId: null } }, subclassOfId: 593369703, result: "payments.ConnectedStarRefBots", isFunction: true, namespace: "payments" },
    { name: "EditConnectedStarRefBot", constructorId: 3841762467, argsConfig: { flags: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: true, type: null, useVectorId: null }, revoked: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 0, flagIndicator: false, type: "true", useVectorId: null }, peer: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputPeer", useVectorId: null }, link: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "string", useVectorId: null } }, subclassOfId: 593369703, result: "payments.ConnectedStarRefBots", isFunction: true, namespace: "payments" },
    { name: "GetStarGiftUpgradePreview", constructorId: 2627386545, argsConfig: { giftId: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "long", useVectorId: null } }, subclassOfId: 1579903175, result: "payments.StarGiftUpgradePreview", isFunction: true, namespace: "payments" },
    { name: "UpgradeStarGift", constructorId: 2933318901, argsConfig: { flags: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: true, type: null, useVectorId: null }, keepOriginalDetails: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 0, flagIndicator: false, type: "true", useVectorId: null }, stargift: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputSavedStarGift", useVectorId: null } }, subclassOfId: 2331323052, result: "Updates", isFunction: true, namespace: "payments" },
    { name: "TransferStarGift", constructorId: 2132285290, argsConfig: { stargift: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputSavedStarGift", useVectorId: null }, toId: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputPeer", useVectorId: null } }, subclassOfId: 2331323052, result: "Updates", isFunction: true, namespace: "payments" },
    { name: "GetUniqueStarGift", constructorId: 2711047538, argsConfig: { slug: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "string", useVectorId: null } }, subclassOfId: 2024850939, result: "payments.UniqueStarGift", isFunction: true, namespace: "payments" },
    { name: "GetSavedStarGifts", constructorId: 2736383337, argsConfig: { flags: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: true, type: null, useVectorId: null }, excludeUnsaved: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 0, flagIndicator: false, type: "true", useVectorId: null }, excludeSaved: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 1, flagIndicator: false, type: "true", useVectorId: null }, excludeUnlimited: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 2, flagIndicator: false, type: "true", useVectorId: null }, excludeUnique: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 4, flagIndicator: false, type: "true", useVectorId: null }, sortByValue: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 5, flagIndicator: false, type: "true", useVectorId: null }, excludeUpgradable: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 7, flagIndicator: false, type: "true", useVectorId: null }, excludeUnupgradable: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 8, flagIndicator: false, type: "true", useVectorId: null }, peerColorAvailable: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 9, flagIndicator: false, type: "true", useVectorId: null }, excludeHosted: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 10, flagIndicator: false, type: "true", useVectorId: null }, peer: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputPeer", useVectorId: null }, collectionId: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 6, flagIndicator: false, type: "int", useVectorId: null }, offset: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "string", useVectorId: null }, limit: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "int", useVectorId: null } }, subclassOfId: 3574671511, result: "payments.SavedStarGifts", isFunction: true, namespace: "payments" },
    { name: "GetSavedStarGift", constructorId: 3025510662, argsConfig: { stargift: { isVector: true, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputSavedStarGift", useVectorId: true } }, subclassOfId: 3574671511, result: "payments.SavedStarGifts", isFunction: true, namespace: "payments" },
    { name: "GetStarGiftWithdrawalUrl", constructorId: 3496907688, argsConfig: { stargift: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputSavedStarGift", useVectorId: null }, password: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputCheckPasswordSRP", useVectorId: null } }, subclassOfId: 2726440389, result: "payments.StarGiftWithdrawalUrl", isFunction: true, namespace: "payments" },
    { name: "ToggleChatStarGiftNotifications", constructorId: 1626009505, argsConfig: { flags: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: true, type: null, useVectorId: null }, enabled: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 0, flagIndicator: false, type: "true", useVectorId: null }, peer: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputPeer", useVectorId: null } }, subclassOfId: 4122188204, result: "Bool", isFunction: true, namespace: "payments" },
    { name: "ToggleStarGiftsPinnedToTop", constructorId: 353626032, argsConfig: { peer: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputPeer", useVectorId: null }, stargift: { isVector: true, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputSavedStarGift", useVectorId: true } }, subclassOfId: 4122188204, result: "Bool", isFunction: true, namespace: "payments" },
    { name: "CanPurchaseStore", constructorId: 1339842215, argsConfig: { purpose: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputStorePaymentPurpose", useVectorId: null } }, subclassOfId: 4122188204, result: "Bool", isFunction: true, namespace: "payments" },
    { name: "GetResaleStarGifts", constructorId: 2053087798, argsConfig: { flags: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: true, type: null, useVectorId: null }, sortByPrice: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 1, flagIndicator: false, type: "true", useVectorId: null }, sortByNum: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 2, flagIndicator: false, type: "true", useVectorId: null }, forCraft: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 4, flagIndicator: false, type: "true", useVectorId: null }, starsOnly: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 5, flagIndicator: false, type: "true", useVectorId: null }, attributesHash: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 0, flagIndicator: false, type: "long", useVectorId: null }, giftId: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "long", useVectorId: null }, attributes: { isVector: true, isFlag: true, skipConstructorId: false, flagName: "flags", flagIndex: 3, flagIndicator: false, type: "StarGiftAttributeId", useVectorId: true }, offset: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "string", useVectorId: null }, limit: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "int", useVectorId: null } }, subclassOfId: 3000743907, result: "payments.ResaleStarGifts", isFunction: true, namespace: "payments" },
    { name: "UpdateStarGiftPrice", constructorId: 3988679883, argsConfig: { stargift: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputSavedStarGift", useVectorId: null }, resellAmount: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "StarsAmount", useVectorId: null } }, subclassOfId: 2331323052, result: "Updates", isFunction: true, namespace: "payments" },
    { name: "CreateStarGiftCollection", constructorId: 524947079, argsConfig: { peer: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputPeer", useVectorId: null }, title: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "string", useVectorId: null }, stargift: { isVector: true, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputSavedStarGift", useVectorId: true } }, subclassOfId: 1138805578, result: "StarGiftCollection", isFunction: true, namespace: "payments" },
    { name: "UpdateStarGiftCollection", constructorId: 1339932391, argsConfig: { flags: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: true, type: null, useVectorId: null }, peer: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputPeer", useVectorId: null }, collectionId: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "int", useVectorId: null }, title: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 0, flagIndicator: false, type: "string", useVectorId: null }, deleteStargift: { isVector: true, isFlag: true, skipConstructorId: false, flagName: "flags", flagIndex: 1, flagIndicator: false, type: "InputSavedStarGift", useVectorId: true }, addStargift: { isVector: true, isFlag: true, skipConstructorId: false, flagName: "flags", flagIndex: 2, flagIndicator: false, type: "InputSavedStarGift", useVectorId: true }, order: { isVector: true, isFlag: true, skipConstructorId: false, flagName: "flags", flagIndex: 3, flagIndicator: false, type: "InputSavedStarGift", useVectorId: true } }, subclassOfId: 1138805578, result: "StarGiftCollection", isFunction: true, namespace: "payments" },
    { name: "ReorderStarGiftCollections", constructorId: 3274372300, argsConfig: { peer: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputPeer", useVectorId: null }, order: { isVector: true, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "int", useVectorId: true } }, subclassOfId: 4122188204, result: "Bool", isFunction: true, namespace: "payments" },
    { name: "DeleteStarGiftCollection", constructorId: 2908113128, argsConfig: { peer: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputPeer", useVectorId: null }, collectionId: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "int", useVectorId: null } }, subclassOfId: 4122188204, result: "Bool", isFunction: true, namespace: "payments" },
    { name: "GetStarGiftCollections", constructorId: 2551943645, argsConfig: { peer: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputPeer", useVectorId: null }, hash: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "long", useVectorId: null } }, subclassOfId: 4028047852, result: "payments.StarGiftCollections", isFunction: true, namespace: "payments" },
    { name: "GetUniqueStarGiftValueInfo", constructorId: 1130737515, argsConfig: { slug: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "string", useVectorId: null } }, subclassOfId: 372595652, result: "payments.UniqueStarGiftValueInfo", isFunction: true, namespace: "payments" },
    { name: "CheckCanSendGift", constructorId: 3234131401, argsConfig: { giftId: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "long", useVectorId: null } }, subclassOfId: 1664023088, result: "payments.CheckCanSendGiftResult", isFunction: true, namespace: "payments" },
    { name: "GetStarGiftAuctionState", constructorId: 1553986774, argsConfig: { auction: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputStarGiftAuction", useVectorId: null }, version: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "int", useVectorId: null } }, subclassOfId: 439453081, result: "payments.StarGiftAuctionState", isFunction: true, namespace: "payments" },
    { name: "GetStarGiftAuctionAcquiredGifts", constructorId: 1805831148, argsConfig: { giftId: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "long", useVectorId: null } }, subclassOfId: 2802321947, result: "payments.StarGiftAuctionAcquiredGifts", isFunction: true, namespace: "payments" },
    { name: "GetStarGiftActiveAuctions", constructorId: 2781892941, argsConfig: { hash: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "long", useVectorId: null } }, subclassOfId: 2440941767, result: "payments.StarGiftActiveAuctions", isFunction: true, namespace: "payments" },
    { name: "ResolveStarGiftOffer", constructorId: 3922622492, argsConfig: { flags: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: true, type: null, useVectorId: null }, decline: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 0, flagIndicator: false, type: "true", useVectorId: null }, offerMsgId: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "int", useVectorId: null } }, subclassOfId: 2331323052, result: "Updates", isFunction: true, namespace: "payments" },
    { name: "SendStarGiftOffer", constructorId: 2411227969, argsConfig: { flags: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: true, type: null, useVectorId: null }, peer: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputPeer", useVectorId: null }, slug: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "string", useVectorId: null }, price: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "StarsAmount", useVectorId: null }, duration: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "int", useVectorId: null }, randomId: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "long", useVectorId: null }, allowPaidStars: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 0, flagIndicator: false, type: "long", useVectorId: null } }, subclassOfId: 2331323052, result: "Updates", isFunction: true, namespace: "payments" },
    { name: "GetStarGiftUpgradeAttributes", constructorId: 1828948824, argsConfig: { giftId: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "long", useVectorId: null } }, subclassOfId: 256290031, result: "payments.StarGiftUpgradeAttributes", isFunction: true, namespace: "payments" },
    { name: "GetCraftStarGifts", constructorId: 4245019904, argsConfig: { giftId: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "long", useVectorId: null }, offset: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "string", useVectorId: null }, limit: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "int", useVectorId: null } }, subclassOfId: 3574671511, result: "payments.SavedStarGifts", isFunction: true, namespace: "payments" },
    { name: "CraftStarGift", constructorId: 2969135183, argsConfig: { stargift: { isVector: true, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputSavedStarGift", useVectorId: true } }, subclassOfId: 2331323052, result: "Updates", isFunction: true, namespace: "payments" },
    { name: "CreateStickerSet", constructorId: 2418125671, argsConfig: { flags: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: true, type: null, useVectorId: null }, masks: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 0, flagIndicator: false, type: "true", useVectorId: null }, emojis: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 5, flagIndicator: false, type: "true", useVectorId: null }, textColor: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 6, flagIndicator: false, type: "true", useVectorId: null }, userId: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputUser", useVectorId: null }, title: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "string", useVectorId: null }, shortName: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "string", useVectorId: null }, thumb: { isVector: false, isFlag: true, skipConstructorId: false, flagName: "flags", flagIndex: 2, flagIndicator: false, type: "InputDocument", useVectorId: null }, stickers: { isVector: true, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputStickerSetItem", useVectorId: true }, software: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 3, flagIndicator: false, type: "string", useVectorId: null } }, subclassOfId: 2607827546, result: "messages.StickerSet", isFunction: true, namespace: "stickers" },
    { name: "RemoveStickerFromSet", constructorId: 4151709521, argsConfig: { sticker: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputDocument", useVectorId: null } }, subclassOfId: 2607827546, result: "messages.StickerSet", isFunction: true, namespace: "stickers" },
    { name: "ChangeStickerPosition", constructorId: 4290172106, argsConfig: { sticker: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputDocument", useVectorId: null }, position: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "int", useVectorId: null } }, subclassOfId: 2607827546, result: "messages.StickerSet", isFunction: true, namespace: "stickers" },
    { name: "AddStickerToSet", constructorId: 2253651646, argsConfig: { stickerset: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputStickerSet", useVectorId: null }, sticker: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputStickerSetItem", useVectorId: null } }, subclassOfId: 2607827546, result: "messages.StickerSet", isFunction: true, namespace: "stickers" },
    { name: "SetStickerSetThumb", constructorId: 2808763282, argsConfig: { flags: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: true, type: null, useVectorId: null }, stickerset: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputStickerSet", useVectorId: null }, thumb: { isVector: false, isFlag: true, skipConstructorId: false, flagName: "flags", flagIndex: 0, flagIndicator: false, type: "InputDocument", useVectorId: null }, thumbDocumentId: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 1, flagIndicator: false, type: "long", useVectorId: null } }, subclassOfId: 2607827546, result: "messages.StickerSet", isFunction: true, namespace: "stickers" },
    { name: "CheckShortName", constructorId: 676017721, argsConfig: { shortName: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "string", useVectorId: null } }, subclassOfId: 4122188204, result: "Bool", isFunction: true, namespace: "stickers" },
    { name: "SuggestShortName", constructorId: 1303364867, argsConfig: { title: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "string", useVectorId: null } }, subclassOfId: 3293203233, result: "stickers.SuggestedShortName", isFunction: true, namespace: "stickers" },
    { name: "ChangeSticker", constructorId: 4115889852, argsConfig: { flags: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: true, type: null, useVectorId: null }, sticker: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputDocument", useVectorId: null }, emoji: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 0, flagIndicator: false, type: "string", useVectorId: null }, maskCoords: { isVector: false, isFlag: true, skipConstructorId: false, flagName: "flags", flagIndex: 1, flagIndicator: false, type: "MaskCoords", useVectorId: null }, keywords: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 2, flagIndicator: false, type: "string", useVectorId: null } }, subclassOfId: 2607827546, result: "messages.StickerSet", isFunction: true, namespace: "stickers" },
    { name: "RenameStickerSet", constructorId: 306912256, argsConfig: { stickerset: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputStickerSet", useVectorId: null }, title: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "string", useVectorId: null } }, subclassOfId: 2607827546, result: "messages.StickerSet", isFunction: true, namespace: "stickers" },
    { name: "DeleteStickerSet", constructorId: 2272281492, argsConfig: { stickerset: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputStickerSet", useVectorId: null } }, subclassOfId: 4122188204, result: "Bool", isFunction: true, namespace: "stickers" },
    { name: "ReplaceSticker", constructorId: 1184253338, argsConfig: { sticker: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputDocument", useVectorId: null }, newSticker: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputStickerSetItem", useVectorId: null } }, subclassOfId: 2607827546, result: "messages.StickerSet", isFunction: true, namespace: "stickers" },
    { name: "GetCallConfig", constructorId: 1430593449, argsConfig: {}, subclassOfId: 2902676200, result: "DataJSON", isFunction: true, namespace: "phone" },
    { name: "RequestCall", constructorId: 1124046573, argsConfig: { flags: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: true, type: null, useVectorId: null }, video: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 0, flagIndicator: false, type: "true", useVectorId: null }, userId: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputUser", useVectorId: null }, randomId: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "int", useVectorId: null }, gAHash: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "bytes", useVectorId: null }, protocol: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "PhoneCallProtocol", useVectorId: null } }, subclassOfId: 3565878863, result: "phone.PhoneCall", isFunction: true, namespace: "phone" },
    { name: "AcceptCall", constructorId: 1003664544, argsConfig: { peer: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputPhoneCall", useVectorId: null }, gB: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "bytes", useVectorId: null }, protocol: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "PhoneCallProtocol", useVectorId: null } }, subclassOfId: 3565878863, result: "phone.PhoneCall", isFunction: true, namespace: "phone" },
    { name: "ConfirmCall", constructorId: 788404002, argsConfig: { peer: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputPhoneCall", useVectorId: null }, gA: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "bytes", useVectorId: null }, keyFingerprint: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "long", useVectorId: null }, protocol: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "PhoneCallProtocol", useVectorId: null } }, subclassOfId: 3565878863, result: "phone.PhoneCall", isFunction: true, namespace: "phone" },
    { name: "ReceivedCall", constructorId: 399855457, argsConfig: { peer: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputPhoneCall", useVectorId: null } }, subclassOfId: 4122188204, result: "Bool", isFunction: true, namespace: "phone" },
    { name: "DiscardCall", constructorId: 2999697856, argsConfig: { flags: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: true, type: null, useVectorId: null }, video: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 0, flagIndicator: false, type: "true", useVectorId: null }, peer: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputPhoneCall", useVectorId: null }, duration: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "int", useVectorId: null }, reason: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "PhoneCallDiscardReason", useVectorId: null }, connectionId: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "long", useVectorId: null } }, subclassOfId: 2331323052, result: "Updates", isFunction: true, namespace: "phone" },
    { name: "SetCallRating", constructorId: 1508562471, argsConfig: { flags: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: true, type: null, useVectorId: null }, userInitiative: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 0, flagIndicator: false, type: "true", useVectorId: null }, peer: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputPhoneCall", useVectorId: null }, rating: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "int", useVectorId: null }, comment: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "string", useVectorId: null } }, subclassOfId: 2331323052, result: "Updates", isFunction: true, namespace: "phone" },
    { name: "SaveCallDebug", constructorId: 662363518, argsConfig: { peer: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputPhoneCall", useVectorId: null }, debug: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "DataJSON", useVectorId: null } }, subclassOfId: 4122188204, result: "Bool", isFunction: true, namespace: "phone" },
    { name: "SendSignalingData", constructorId: 4286223235, argsConfig: { peer: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputPhoneCall", useVectorId: null }, data: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "bytes", useVectorId: null } }, subclassOfId: 4122188204, result: "Bool", isFunction: true, namespace: "phone" },
    { name: "CreateGroupCall", constructorId: 1221445336, argsConfig: { flags: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: true, type: null, useVectorId: null }, rtmpStream: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 2, flagIndicator: false, type: "true", useVectorId: null }, peer: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputPeer", useVectorId: null }, randomId: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "int", useVectorId: null }, title: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 0, flagIndicator: false, type: "string", useVectorId: null }, scheduleDate: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 1, flagIndicator: false, type: "int", useVectorId: null } }, subclassOfId: 2331323052, result: "Updates", isFunction: true, namespace: "phone" },
    { name: "JoinGroupCall", constructorId: 2411016279, argsConfig: { flags: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: true, type: null, useVectorId: null }, muted: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 0, flagIndicator: false, type: "true", useVectorId: null }, videoStopped: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 2, flagIndicator: false, type: "true", useVectorId: null }, call: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputGroupCall", useVectorId: null }, joinAs: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputPeer", useVectorId: null }, inviteHash: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 1, flagIndicator: false, type: "string", useVectorId: null }, publicKey: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 3, flagIndicator: false, type: "int256", useVectorId: null }, block: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 3, flagIndicator: false, type: "bytes", useVectorId: null }, params: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "DataJSON", useVectorId: null } }, subclassOfId: 2331323052, result: "Updates", isFunction: true, namespace: "phone" },
    { name: "LeaveGroupCall", constructorId: 1342404601, argsConfig: { call: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputGroupCall", useVectorId: null }, source: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "int", useVectorId: null } }, subclassOfId: 2331323052, result: "Updates", isFunction: true, namespace: "phone" },
    { name: "InviteToGroupCall", constructorId: 2067345760, argsConfig: { call: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputGroupCall", useVectorId: null }, users: { isVector: true, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputUser", useVectorId: true } }, subclassOfId: 2331323052, result: "Updates", isFunction: true, namespace: "phone" },
    { name: "DiscardGroupCall", constructorId: 2054648117, argsConfig: { call: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputGroupCall", useVectorId: null } }, subclassOfId: 2331323052, result: "Updates", isFunction: true, namespace: "phone" },
    { name: "ToggleGroupCallSettings", constructorId: 2537788146, argsConfig: { flags: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: true, type: null, useVectorId: null }, resetInviteHash: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 1, flagIndicator: false, type: "true", useVectorId: null }, call: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputGroupCall", useVectorId: null }, joinMuted: { isVector: false, isFlag: true, skipConstructorId: false, flagName: "flags", flagIndex: 0, flagIndicator: false, type: "Bool", useVectorId: null }, messagesEnabled: { isVector: false, isFlag: true, skipConstructorId: false, flagName: "flags", flagIndex: 2, flagIndicator: false, type: "Bool", useVectorId: null }, sendPaidMessagesStars: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 3, flagIndicator: false, type: "long", useVectorId: null } }, subclassOfId: 2331323052, result: "Updates", isFunction: true, namespace: "phone" },
    { name: "GetGroupCall", constructorId: 68699611, argsConfig: { call: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputGroupCall", useVectorId: null }, limit: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "int", useVectorId: null } }, subclassOfId: 809572030, result: "phone.GroupCall", isFunction: true, namespace: "phone" },
    { name: "GetGroupParticipants", constructorId: 3310934187, argsConfig: { call: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputGroupCall", useVectorId: null }, ids: { isVector: true, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputPeer", useVectorId: true }, sources: { isVector: true, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "int", useVectorId: true }, offset: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "string", useVectorId: null }, limit: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "int", useVectorId: null } }, subclassOfId: 1926431988, result: "phone.GroupParticipants", isFunction: true, namespace: "phone" },
    { name: "CheckGroupCall", constructorId: 3046963575, argsConfig: { call: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputGroupCall", useVectorId: null }, sources: { isVector: true, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "int", useVectorId: true } }, subclassOfId: 1344696591, result: "Vector<int>", isFunction: true, namespace: "phone" },
    { name: "ToggleGroupCallRecord", constructorId: 4045981448, argsConfig: { flags: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: true, type: null, useVectorId: null }, start: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 0, flagIndicator: false, type: "true", useVectorId: null }, video: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 2, flagIndicator: false, type: "true", useVectorId: null }, call: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputGroupCall", useVectorId: null }, title: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 1, flagIndicator: false, type: "string", useVectorId: null }, videoPortrait: { isVector: false, isFlag: true, skipConstructorId: false, flagName: "flags", flagIndex: 2, flagIndicator: false, type: "Bool", useVectorId: null } }, subclassOfId: 2331323052, result: "Updates", isFunction: true, namespace: "phone" },
    { name: "EditGroupCallParticipant", constructorId: 2770811583, argsConfig: { flags: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: true, type: null, useVectorId: null }, call: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputGroupCall", useVectorId: null }, participant: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputPeer", useVectorId: null }, muted: { isVector: false, isFlag: true, skipConstructorId: false, flagName: "flags", flagIndex: 0, flagIndicator: false, type: "Bool", useVectorId: null }, volume: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 1, flagIndicator: false, type: "int", useVectorId: null }, raiseHand: { isVector: false, isFlag: true, skipConstructorId: false, flagName: "flags", flagIndex: 2, flagIndicator: false, type: "Bool", useVectorId: null }, videoStopped: { isVector: false, isFlag: true, skipConstructorId: false, flagName: "flags", flagIndex: 3, flagIndicator: false, type: "Bool", useVectorId: null }, videoPaused: { isVector: false, isFlag: true, skipConstructorId: false, flagName: "flags", flagIndex: 4, flagIndicator: false, type: "Bool", useVectorId: null }, presentationPaused: { isVector: false, isFlag: true, skipConstructorId: false, flagName: "flags", flagIndex: 5, flagIndicator: false, type: "Bool", useVectorId: null } }, subclassOfId: 2331323052, result: "Updates", isFunction: true, namespace: "phone" },
    { name: "EditGroupCallTitle", constructorId: 480685066, argsConfig: { call: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputGroupCall", useVectorId: null }, title: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "string", useVectorId: null } }, subclassOfId: 2331323052, result: "Updates", isFunction: true, namespace: "phone" },
    { name: "GetGroupCallJoinAs", constructorId: 4017889594, argsConfig: { peer: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputPeer", useVectorId: null } }, subclassOfId: 3031920891, result: "phone.JoinAsPeers", isFunction: true, namespace: "phone" },
    { name: "ExportGroupCallInvite", constructorId: 3869926527, argsConfig: { flags: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: true, type: null, useVectorId: null }, canSelfUnmute: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 0, flagIndicator: false, type: "true", useVectorId: null }, call: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputGroupCall", useVectorId: null } }, subclassOfId: 993787535, result: "phone.ExportedGroupCallInvite", isFunction: true, namespace: "phone" },
    { name: "ToggleGroupCallStartSubscription", constructorId: 563885286, argsConfig: { call: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputGroupCall", useVectorId: null }, subscribed: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "Bool", useVectorId: null } }, subclassOfId: 2331323052, result: "Updates", isFunction: true, namespace: "phone" },
    { name: "StartScheduledGroupCall", constructorId: 1451287362, argsConfig: { call: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputGroupCall", useVectorId: null } }, subclassOfId: 2331323052, result: "Updates", isFunction: true, namespace: "phone" },
    { name: "SaveDefaultGroupCallJoinAs", constructorId: 1465786252, argsConfig: { peer: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputPeer", useVectorId: null }, joinAs: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputPeer", useVectorId: null } }, subclassOfId: 4122188204, result: "Bool", isFunction: true, namespace: "phone" },
    { name: "JoinGroupCallPresentation", constructorId: 3421137860, argsConfig: { call: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputGroupCall", useVectorId: null }, params: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "DataJSON", useVectorId: null } }, subclassOfId: 2331323052, result: "Updates", isFunction: true, namespace: "phone" },
    { name: "LeaveGroupCallPresentation", constructorId: 475058500, argsConfig: { call: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputGroupCall", useVectorId: null } }, subclassOfId: 2331323052, result: "Updates", isFunction: true, namespace: "phone" },
    { name: "GetGroupCallStreamChannels", constructorId: 447879488, argsConfig: { call: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputGroupCall", useVectorId: null } }, subclassOfId: 2438448612, result: "phone.GroupCallStreamChannels", isFunction: true, namespace: "phone" },
    { name: "GetGroupCallStreamRtmpUrl", constructorId: 1525991226, argsConfig: { flags: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: true, type: null, useVectorId: null }, liveStory: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 0, flagIndicator: false, type: "true", useVectorId: null }, peer: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputPeer", useVectorId: null }, revoke: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "Bool", useVectorId: null } }, subclassOfId: 3522500043, result: "phone.GroupCallStreamRtmpUrl", isFunction: true, namespace: "phone" },
    { name: "SaveCallLog", constructorId: 1092913030, argsConfig: { peer: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputPhoneCall", useVectorId: null }, file: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputFile", useVectorId: null } }, subclassOfId: 4122188204, result: "Bool", isFunction: true, namespace: "phone" },
    { name: "CreateConferenceCall", constructorId: 2097431739, argsConfig: { flags: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: true, type: null, useVectorId: null }, muted: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 0, flagIndicator: false, type: "true", useVectorId: null }, videoStopped: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 2, flagIndicator: false, type: "true", useVectorId: null }, join: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 3, flagIndicator: false, type: "true", useVectorId: null }, randomId: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "int", useVectorId: null }, publicKey: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 3, flagIndicator: false, type: "int256", useVectorId: null }, block: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 3, flagIndicator: false, type: "bytes", useVectorId: null }, params: { isVector: false, isFlag: true, skipConstructorId: false, flagName: "flags", flagIndex: 3, flagIndicator: false, type: "DataJSON", useVectorId: null } }, subclassOfId: 2331323052, result: "Updates", isFunction: true, namespace: "phone" },
    { name: "DeleteConferenceCallParticipants", constructorId: 2359690533, argsConfig: { flags: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: true, type: null, useVectorId: null }, onlyLeft: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 0, flagIndicator: false, type: "true", useVectorId: null }, kick: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 1, flagIndicator: false, type: "true", useVectorId: null }, call: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputGroupCall", useVectorId: null }, ids: { isVector: true, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "long", useVectorId: true }, block: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "bytes", useVectorId: null } }, subclassOfId: 2331323052, result: "Updates", isFunction: true, namespace: "phone" },
    { name: "SendConferenceCallBroadcast", constructorId: 3329235200, argsConfig: { call: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputGroupCall", useVectorId: null }, block: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "bytes", useVectorId: null } }, subclassOfId: 2331323052, result: "Updates", isFunction: true, namespace: "phone" },
    { name: "InviteConferenceCallParticipant", constructorId: 3169986181, argsConfig: { flags: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: true, type: null, useVectorId: null }, video: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 0, flagIndicator: false, type: "true", useVectorId: null }, call: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputGroupCall", useVectorId: null }, userId: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputUser", useVectorId: null } }, subclassOfId: 2331323052, result: "Updates", isFunction: true, namespace: "phone" },
    { name: "DeclineConferenceCallInvite", constructorId: 1011325297, argsConfig: { msgId: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "int", useVectorId: null } }, subclassOfId: 2331323052, result: "Updates", isFunction: true, namespace: "phone" },
    { name: "GetGroupCallChainBlocks", constructorId: 4003432614, argsConfig: { call: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputGroupCall", useVectorId: null }, subChainId: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "int", useVectorId: null }, offset: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "int", useVectorId: null }, limit: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "int", useVectorId: null } }, subclassOfId: 2331323052, result: "Updates", isFunction: true, namespace: "phone" },
    { name: "SendGroupCallMessage", constructorId: 2983269392, argsConfig: { flags: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: true, type: null, useVectorId: null }, call: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputGroupCall", useVectorId: null }, randomId: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "long", useVectorId: null }, message: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "TextWithEntities", useVectorId: null }, allowPaidStars: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 0, flagIndicator: false, type: "long", useVectorId: null }, sendAs: { isVector: false, isFlag: true, skipConstructorId: false, flagName: "flags", flagIndex: 1, flagIndicator: false, type: "InputPeer", useVectorId: null } }, subclassOfId: 2331323052, result: "Updates", isFunction: true, namespace: "phone" },
    { name: "SendGroupCallEncryptedMessage", constructorId: 3853493613, argsConfig: { call: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputGroupCall", useVectorId: null }, encryptedMessage: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "bytes", useVectorId: null } }, subclassOfId: 4122188204, result: "Bool", isFunction: true, namespace: "phone" },
    { name: "DeleteGroupCallMessages", constructorId: 4132394231, argsConfig: { flags: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: true, type: null, useVectorId: null }, reportSpam: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 0, flagIndicator: false, type: "true", useVectorId: null }, call: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputGroupCall", useVectorId: null }, messages: { isVector: true, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "int", useVectorId: true } }, subclassOfId: 2331323052, result: "Updates", isFunction: true, namespace: "phone" },
    { name: "DeleteGroupCallParticipantMessages", constructorId: 499117216, argsConfig: { flags: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: true, type: null, useVectorId: null }, reportSpam: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 0, flagIndicator: false, type: "true", useVectorId: null }, call: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputGroupCall", useVectorId: null }, participant: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputPeer", useVectorId: null } }, subclassOfId: 2331323052, result: "Updates", isFunction: true, namespace: "phone" },
    { name: "GetGroupCallStars", constructorId: 1868784386, argsConfig: { call: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputGroupCall", useVectorId: null } }, subclassOfId: 3024584730, result: "phone.GroupCallStars", isFunction: true, namespace: "phone" },
    { name: "SaveDefaultSendAs", constructorId: 1097313745, argsConfig: { call: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputGroupCall", useVectorId: null }, sendAs: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputPeer", useVectorId: null } }, subclassOfId: 4122188204, result: "Bool", isFunction: true, namespace: "phone" },
    { name: "GetLangPack", constructorId: 4075959050, argsConfig: { langPack: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "string", useVectorId: null }, langCode: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "string", useVectorId: null } }, subclassOfId: 1382427989, result: "LangPackDifference", isFunction: true, namespace: "langpack" },
    { name: "GetStrings", constructorId: 4025104387, argsConfig: { langPack: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "string", useVectorId: null }, langCode: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "string", useVectorId: null }, keys: { isVector: true, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "string", useVectorId: true } }, subclassOfId: 3350672701, result: "Vector<LangPackString>", isFunction: true, namespace: "langpack" },
    { name: "GetDifference", constructorId: 3449309861, argsConfig: { langPack: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "string", useVectorId: null }, langCode: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "string", useVectorId: null }, fromVersion: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "int", useVectorId: null } }, subclassOfId: 1382427989, result: "LangPackDifference", isFunction: true, namespace: "langpack" },
    { name: "GetLanguages", constructorId: 1120311183, argsConfig: { langPack: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "string", useVectorId: null } }, subclassOfId: 671683273, result: "Vector<LangPackLanguage>", isFunction: true, namespace: "langpack" },
    { name: "GetLanguage", constructorId: 1784243458, argsConfig: { langPack: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "string", useVectorId: null }, langCode: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "string", useVectorId: null } }, subclassOfId: 2880211383, result: "LangPackLanguage", isFunction: true, namespace: "langpack" },
    { name: "EditPeerFolders", constructorId: 1749536939, argsConfig: { folderPeers: { isVector: true, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputFolderPeer", useVectorId: true } }, subclassOfId: 2331323052, result: "Updates", isFunction: true, namespace: "folders" },
    { name: "GetBroadcastStats", constructorId: 2873246746, argsConfig: { flags: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: true, type: null, useVectorId: null }, dark: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 0, flagIndicator: false, type: "true", useVectorId: null }, channel: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputChannel", useVectorId: null } }, subclassOfId: 2146587688, result: "stats.BroadcastStats", isFunction: true, namespace: "stats" },
    { name: "LoadAsyncGraph", constructorId: 1646092192, argsConfig: { flags: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: true, type: null, useVectorId: null }, token: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "string", useVectorId: null }, x: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 0, flagIndicator: false, type: "long", useVectorId: null } }, subclassOfId: 2609918291, result: "StatsGraph", isFunction: true, namespace: "stats" },
    { name: "GetMegagroupStats", constructorId: 3705636359, argsConfig: { flags: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: true, type: null, useVectorId: null }, dark: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 0, flagIndicator: false, type: "true", useVectorId: null }, channel: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputChannel", useVectorId: null } }, subclassOfId: 1532608141, result: "stats.MegagroupStats", isFunction: true, namespace: "stats" },
    { name: "GetMessagePublicForwards", constructorId: 1595212100, argsConfig: { channel: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputChannel", useVectorId: null }, msgId: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "int", useVectorId: null }, offset: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "string", useVectorId: null }, limit: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "int", useVectorId: null } }, subclassOfId: 2804429329, result: "stats.PublicForwards", isFunction: true, namespace: "stats" },
    { name: "GetMessageStats", constructorId: 3068175349, argsConfig: { flags: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: true, type: null, useVectorId: null }, dark: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 0, flagIndicator: false, type: "true", useVectorId: null }, channel: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputChannel", useVectorId: null }, msgId: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "int", useVectorId: null } }, subclassOfId: 2516886306, result: "stats.MessageStats", isFunction: true, namespace: "stats" },
    { name: "GetStoryStats", constructorId: 927985472, argsConfig: { flags: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: true, type: null, useVectorId: null }, dark: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 0, flagIndicator: false, type: "true", useVectorId: null }, peer: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputPeer", useVectorId: null }, id: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "int", useVectorId: null } }, subclassOfId: 2337096660, result: "stats.StoryStats", isFunction: true, namespace: "stats" },
    { name: "GetStoryPublicForwards", constructorId: 2789441270, argsConfig: { peer: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputPeer", useVectorId: null }, id: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "int", useVectorId: null }, offset: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "string", useVectorId: null }, limit: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "int", useVectorId: null } }, subclassOfId: 2804429329, result: "stats.PublicForwards", isFunction: true, namespace: "stats" },
    { name: "GetPollStats", constructorId: 3263036008, argsConfig: { flags: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: true, type: null, useVectorId: null }, dark: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 0, flagIndicator: false, type: "true", useVectorId: null }, peer: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputPeer", useVectorId: null }, msgId: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "int", useVectorId: null } }, subclassOfId: 3914437839, result: "stats.PollStats", isFunction: true, namespace: "stats" },
    { name: "ExportChatlistInvite", constructorId: 2222081934, argsConfig: { chatlist: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputChatlist", useVectorId: null }, title: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "string", useVectorId: null }, peers: { isVector: true, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputPeer", useVectorId: true } }, subclassOfId: 3261681385, result: "chatlists.ExportedChatlistInvite", isFunction: true, namespace: "chatlists" },
    { name: "DeleteExportedInvite", constructorId: 1906072670, argsConfig: { chatlist: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputChatlist", useVectorId: null }, slug: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "string", useVectorId: null } }, subclassOfId: 4122188204, result: "Bool", isFunction: true, namespace: "chatlists" },
    { name: "EditExportedInvite", constructorId: 1698543165, argsConfig: { flags: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: true, type: null, useVectorId: null }, chatlist: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputChatlist", useVectorId: null }, slug: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "string", useVectorId: null }, title: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 1, flagIndicator: false, type: "string", useVectorId: null }, peers: { isVector: true, isFlag: true, skipConstructorId: false, flagName: "flags", flagIndex: 2, flagIndicator: false, type: "InputPeer", useVectorId: true } }, subclassOfId: 1997666559, result: "ExportedChatlistInvite", isFunction: true, namespace: "chatlists" },
    { name: "GetExportedInvites", constructorId: 3456359043, argsConfig: { chatlist: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputChatlist", useVectorId: null } }, subclassOfId: 3871476160, result: "chatlists.ExportedInvites", isFunction: true, namespace: "chatlists" },
    { name: "CheckChatlistInvite", constructorId: 1103171583, argsConfig: { slug: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "string", useVectorId: null } }, subclassOfId: 1097993845, result: "chatlists.ChatlistInvite", isFunction: true, namespace: "chatlists" },
    { name: "JoinChatlistInvite", constructorId: 2796675994, argsConfig: { slug: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "string", useVectorId: null }, peers: { isVector: true, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputPeer", useVectorId: true } }, subclassOfId: 2331323052, result: "Updates", isFunction: true, namespace: "chatlists" },
    { name: "GetChatlistUpdates", constructorId: 2302776609, argsConfig: { chatlist: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputChatlist", useVectorId: null } }, subclassOfId: 2098610666, result: "chatlists.ChatlistUpdates", isFunction: true, namespace: "chatlists" },
    { name: "JoinChatlistUpdates", constructorId: 3767138549, argsConfig: { chatlist: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputChatlist", useVectorId: null }, peers: { isVector: true, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputPeer", useVectorId: true } }, subclassOfId: 2331323052, result: "Updates", isFunction: true, namespace: "chatlists" },
    { name: "HideChatlistUpdates", constructorId: 1726252795, argsConfig: { chatlist: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputChatlist", useVectorId: null } }, subclassOfId: 4122188204, result: "Bool", isFunction: true, namespace: "chatlists" },
    { name: "GetLeaveChatlistSuggestions", constructorId: 4257011476, argsConfig: { chatlist: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputChatlist", useVectorId: null } }, subclassOfId: 3113508222, result: "Vector<Peer>", isFunction: true, namespace: "chatlists" },
    { name: "LeaveChatlist", constructorId: 1962598714, argsConfig: { chatlist: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputChatlist", useVectorId: null }, peers: { isVector: true, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputPeer", useVectorId: true } }, subclassOfId: 2331323052, result: "Updates", isFunction: true, namespace: "chatlists" },
    { name: "CanSendStory", constructorId: 820732912, argsConfig: { peer: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputPeer", useVectorId: null } }, subclassOfId: 3411255960, result: "stories.CanSendStoryCount", isFunction: true, namespace: "stories" },
    { name: "SendStory", constructorId: 2409523352, argsConfig: { flags: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: true, type: null, useVectorId: null }, pinned: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 2, flagIndicator: false, type: "true", useVectorId: null }, noforwards: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 4, flagIndicator: false, type: "true", useVectorId: null }, fwdModified: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 7, flagIndicator: false, type: "true", useVectorId: null }, peer: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputPeer", useVectorId: null }, media: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputMedia", useVectorId: null }, mediaAreas: { isVector: true, isFlag: true, skipConstructorId: false, flagName: "flags", flagIndex: 5, flagIndicator: false, type: "MediaArea", useVectorId: true }, caption: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 0, flagIndicator: false, type: "string", useVectorId: null }, entities: { isVector: true, isFlag: true, skipConstructorId: false, flagName: "flags", flagIndex: 1, flagIndicator: false, type: "MessageEntity", useVectorId: true }, privacyRules: { isVector: true, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputPrivacyRule", useVectorId: true }, randomId: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "long", useVectorId: null }, period: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 3, flagIndicator: false, type: "int", useVectorId: null }, fwdFromId: { isVector: false, isFlag: true, skipConstructorId: false, flagName: "flags", flagIndex: 6, flagIndicator: false, type: "InputPeer", useVectorId: null }, fwdFromStory: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 6, flagIndicator: false, type: "int", useVectorId: null }, albums: { isVector: true, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 8, flagIndicator: false, type: "int", useVectorId: true }, music: { isVector: false, isFlag: true, skipConstructorId: false, flagName: "flags", flagIndex: 9, flagIndicator: false, type: "InputDocument", useVectorId: null } }, subclassOfId: 2331323052, result: "Updates", isFunction: true, namespace: "stories" },
    { name: "EditStory", constructorId: 744728363, argsConfig: { flags: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: true, type: null, useVectorId: null }, peer: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputPeer", useVectorId: null }, id: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "int", useVectorId: null }, media: { isVector: false, isFlag: true, skipConstructorId: false, flagName: "flags", flagIndex: 0, flagIndicator: false, type: "InputMedia", useVectorId: null }, mediaAreas: { isVector: true, isFlag: true, skipConstructorId: false, flagName: "flags", flagIndex: 3, flagIndicator: false, type: "MediaArea", useVectorId: true }, caption: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 1, flagIndicator: false, type: "string", useVectorId: null }, entities: { isVector: true, isFlag: true, skipConstructorId: false, flagName: "flags", flagIndex: 1, flagIndicator: false, type: "MessageEntity", useVectorId: true }, privacyRules: { isVector: true, isFlag: true, skipConstructorId: false, flagName: "flags", flagIndex: 2, flagIndicator: false, type: "InputPrivacyRule", useVectorId: true }, music: { isVector: false, isFlag: true, skipConstructorId: false, flagName: "flags", flagIndex: 4, flagIndicator: false, type: "InputDocument", useVectorId: null } }, subclassOfId: 2331323052, result: "Updates", isFunction: true, namespace: "stories" },
    { name: "DeleteStories", constructorId: 2925124447, argsConfig: { peer: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputPeer", useVectorId: null }, id: { isVector: true, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "int", useVectorId: true } }, subclassOfId: 1344696591, result: "Vector<int>", isFunction: true, namespace: "stories" },
    { name: "TogglePinned", constructorId: 2591400431, argsConfig: { peer: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputPeer", useVectorId: null }, id: { isVector: true, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "int", useVectorId: true }, pinned: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "Bool", useVectorId: null } }, subclassOfId: 1344696591, result: "Vector<int>", isFunction: true, namespace: "stories" },
    { name: "GetAllStories", constructorId: 4004566565, argsConfig: { flags: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: true, type: null, useVectorId: null }, next: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 1, flagIndicator: false, type: "true", useVectorId: null }, hidden: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 2, flagIndicator: false, type: "true", useVectorId: null }, state: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 0, flagIndicator: false, type: "string", useVectorId: null } }, subclassOfId: 2120274125, result: "stories.AllStories", isFunction: true, namespace: "stories" },
    { name: "GetPinnedStories", constructorId: 1478600156, argsConfig: { peer: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputPeer", useVectorId: null }, offsetId: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "int", useVectorId: null }, limit: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "int", useVectorId: null } }, subclassOfId: 622595116, result: "stories.Stories", isFunction: true, namespace: "stories" },
    { name: "GetStoriesArchive", constructorId: 3023380502, argsConfig: { peer: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputPeer", useVectorId: null }, offsetId: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "int", useVectorId: null }, limit: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "int", useVectorId: null } }, subclassOfId: 622595116, result: "stories.Stories", isFunction: true, namespace: "stories" },
    { name: "GetStoriesByID", constructorId: 1467271796, argsConfig: { peer: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputPeer", useVectorId: null }, id: { isVector: true, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "int", useVectorId: true } }, subclassOfId: 622595116, result: "stories.Stories", isFunction: true, namespace: "stories" },
    { name: "ToggleAllStoriesHidden", constructorId: 2082822084, argsConfig: { hidden: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "Bool", useVectorId: null } }, subclassOfId: 4122188204, result: "Bool", isFunction: true, namespace: "stories" },
    { name: "ReadStories", constructorId: 2773932744, argsConfig: { peer: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputPeer", useVectorId: null }, maxId: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "int", useVectorId: null } }, subclassOfId: 1344696591, result: "Vector<int>", isFunction: true, namespace: "stories" },
    { name: "IncrementStoryViews", constructorId: 2986511099, argsConfig: { peer: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputPeer", useVectorId: null }, id: { isVector: true, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "int", useVectorId: true } }, subclassOfId: 4122188204, result: "Bool", isFunction: true, namespace: "stories" },
    { name: "GetStoryViewsList", constructorId: 2127707223, argsConfig: { flags: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: true, type: null, useVectorId: null }, justContacts: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 0, flagIndicator: false, type: "true", useVectorId: null }, reactionsFirst: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 2, flagIndicator: false, type: "true", useVectorId: null }, forwardsFirst: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 3, flagIndicator: false, type: "true", useVectorId: null }, peer: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputPeer", useVectorId: null }, q: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 1, flagIndicator: false, type: "string", useVectorId: null }, id: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "int", useVectorId: null }, offset: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "string", useVectorId: null }, limit: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "int", useVectorId: null } }, subclassOfId: 3108205920, result: "stories.StoryViewsList", isFunction: true, namespace: "stories" },
    { name: "GetStoriesViews", constructorId: 685862088, argsConfig: { peer: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputPeer", useVectorId: null }, id: { isVector: true, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "int", useVectorId: true } }, subclassOfId: 1262470330, result: "stories.StoryViews", isFunction: true, namespace: "stories" },
    { name: "ExportStoryLink", constructorId: 2072899360, argsConfig: { peer: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputPeer", useVectorId: null }, id: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "int", useVectorId: null } }, subclassOfId: 264585638, result: "ExportedStoryLink", isFunction: true, namespace: "stories" },
    { name: "Report", constructorId: 433646405, argsConfig: { peer: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputPeer", useVectorId: null }, id: { isVector: true, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "int", useVectorId: true }, option: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "bytes", useVectorId: null }, message: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "string", useVectorId: null } }, subclassOfId: 2899571768, result: "ReportResult", isFunction: true, namespace: "stories" },
    { name: "ActivateStealthMode", constructorId: 1471926630, argsConfig: { flags: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: true, type: null, useVectorId: null }, past: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 0, flagIndicator: false, type: "true", useVectorId: null }, future: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 1, flagIndicator: false, type: "true", useVectorId: null } }, subclassOfId: 2331323052, result: "Updates", isFunction: true, namespace: "stories" },
    { name: "SendReaction", constructorId: 2144810674, argsConfig: { flags: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: true, type: null, useVectorId: null }, addToRecent: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 0, flagIndicator: false, type: "true", useVectorId: null }, peer: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputPeer", useVectorId: null }, storyId: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "int", useVectorId: null }, reaction: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "Reaction", useVectorId: null } }, subclassOfId: 2331323052, result: "Updates", isFunction: true, namespace: "stories" },
    { name: "GetPeerStories", constructorId: 743103056, argsConfig: { peer: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputPeer", useVectorId: null } }, subclassOfId: 2639712208, result: "stories.PeerStories", isFunction: true, namespace: "stories" },
    { name: "GetAllReadPeerStories", constructorId: 2606426105, argsConfig: {}, subclassOfId: 2331323052, result: "Updates", isFunction: true, namespace: "stories" },
    { name: "GetPeerMaxIDs", constructorId: 2018087280, argsConfig: { id: { isVector: true, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputPeer", useVectorId: true } }, subclassOfId: 1018597718, result: "Vector<RecentStory>", isFunction: true, namespace: "stories" },
    { name: "GetChatsToSend", constructorId: 2775223136, argsConfig: {}, subclassOfId: 2580925204, result: "messages.Chats", isFunction: true, namespace: "stories" },
    { name: "TogglePeerStoriesHidden", constructorId: 3171161540, argsConfig: { peer: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputPeer", useVectorId: null }, hidden: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "Bool", useVectorId: null } }, subclassOfId: 4122188204, result: "Bool", isFunction: true, namespace: "stories" },
    { name: "GetStoryReactionsList", constructorId: 3115485215, argsConfig: { flags: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: true, type: null, useVectorId: null }, forwardsFirst: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 2, flagIndicator: false, type: "true", useVectorId: null }, peer: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputPeer", useVectorId: null }, id: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "int", useVectorId: null }, reaction: { isVector: false, isFlag: true, skipConstructorId: false, flagName: "flags", flagIndex: 0, flagIndicator: false, type: "Reaction", useVectorId: null }, offset: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 1, flagIndicator: false, type: "string", useVectorId: null }, limit: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "int", useVectorId: null } }, subclassOfId: 74420707, result: "stories.StoryReactionsList", isFunction: true, namespace: "stories" },
    { name: "TogglePinnedToTop", constructorId: 187268763, argsConfig: { peer: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputPeer", useVectorId: null }, id: { isVector: true, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "int", useVectorId: true } }, subclassOfId: 4122188204, result: "Bool", isFunction: true, namespace: "stories" },
    { name: "SearchPosts", constructorId: 3514894599, argsConfig: { flags: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: true, type: null, useVectorId: null }, hashtag: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 0, flagIndicator: false, type: "string", useVectorId: null }, area: { isVector: false, isFlag: true, skipConstructorId: false, flagName: "flags", flagIndex: 1, flagIndicator: false, type: "MediaArea", useVectorId: null }, peer: { isVector: false, isFlag: true, skipConstructorId: false, flagName: "flags", flagIndex: 2, flagIndicator: false, type: "InputPeer", useVectorId: null }, offset: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "string", useVectorId: null }, limit: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "int", useVectorId: null } }, subclassOfId: 393808693, result: "stories.FoundStories", isFunction: true, namespace: "stories" },
    { name: "CreateAlbum", constructorId: 2741212901, argsConfig: { peer: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputPeer", useVectorId: null }, title: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "string", useVectorId: null }, stories: { isVector: true, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "int", useVectorId: true } }, subclassOfId: 2089574050, result: "StoryAlbum", isFunction: true, namespace: "stories" },
    { name: "UpdateAlbum", constructorId: 1582455222, argsConfig: { flags: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: true, type: null, useVectorId: null }, peer: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputPeer", useVectorId: null }, albumId: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "int", useVectorId: null }, title: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 0, flagIndicator: false, type: "string", useVectorId: null }, deleteStories: { isVector: true, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 1, flagIndicator: false, type: "int", useVectorId: true }, addStories: { isVector: true, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 2, flagIndicator: false, type: "int", useVectorId: true }, order: { isVector: true, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 3, flagIndicator: false, type: "int", useVectorId: true } }, subclassOfId: 2089574050, result: "StoryAlbum", isFunction: true, namespace: "stories" },
    { name: "ReorderAlbums", constructorId: 2234907609, argsConfig: { peer: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputPeer", useVectorId: null }, order: { isVector: true, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "int", useVectorId: true } }, subclassOfId: 4122188204, result: "Bool", isFunction: true, namespace: "stories" },
    { name: "DeleteAlbum", constructorId: 2369017552, argsConfig: { peer: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputPeer", useVectorId: null }, albumId: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "int", useVectorId: null } }, subclassOfId: 4122188204, result: "Bool", isFunction: true, namespace: "stories" },
    { name: "GetAlbums", constructorId: 632548039, argsConfig: { peer: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputPeer", useVectorId: null }, hash: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "long", useVectorId: null } }, subclassOfId: 94846265, result: "stories.Albums", isFunction: true, namespace: "stories" },
    { name: "GetAlbumStories", constructorId: 2894097761, argsConfig: { peer: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputPeer", useVectorId: null }, albumId: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "int", useVectorId: null }, offset: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "int", useVectorId: null }, limit: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "int", useVectorId: null } }, subclassOfId: 622595116, result: "stories.Stories", isFunction: true, namespace: "stories" },
    { name: "StartLive", constructorId: 3496594654, argsConfig: { flags: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: true, type: null, useVectorId: null }, pinned: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 2, flagIndicator: false, type: "true", useVectorId: null }, noforwards: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 4, flagIndicator: false, type: "true", useVectorId: null }, rtmpStream: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 5, flagIndicator: false, type: "true", useVectorId: null }, peer: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputPeer", useVectorId: null }, caption: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 0, flagIndicator: false, type: "string", useVectorId: null }, entities: { isVector: true, isFlag: true, skipConstructorId: false, flagName: "flags", flagIndex: 1, flagIndicator: false, type: "MessageEntity", useVectorId: true }, privacyRules: { isVector: true, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputPrivacyRule", useVectorId: true }, randomId: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "long", useVectorId: null }, messagesEnabled: { isVector: false, isFlag: true, skipConstructorId: false, flagName: "flags", flagIndex: 6, flagIndicator: false, type: "Bool", useVectorId: null }, sendPaidMessagesStars: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 7, flagIndicator: false, type: "long", useVectorId: null } }, subclassOfId: 2331323052, result: "Updates", isFunction: true, namespace: "stories" },
    { name: "GetBoostsList", constructorId: 1626764896, argsConfig: { flags: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: true, type: null, useVectorId: null }, gifts: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 0, flagIndicator: false, type: "true", useVectorId: null }, peer: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputPeer", useVectorId: null }, offset: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "string", useVectorId: null }, limit: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "int", useVectorId: null } }, subclassOfId: 573941949, result: "premium.BoostsList", isFunction: true, namespace: "premium" },
    { name: "GetMyBoosts", constructorId: 199719754, argsConfig: {}, subclassOfId: 2905936603, result: "premium.MyBoosts", isFunction: true, namespace: "premium" },
    { name: "ApplyBoost", constructorId: 1803396934, argsConfig: { flags: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: true, type: null, useVectorId: null }, slots: { isVector: true, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 0, flagIndicator: false, type: "int", useVectorId: true }, peer: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputPeer", useVectorId: null } }, subclassOfId: 2905936603, result: "premium.MyBoosts", isFunction: true, namespace: "premium" },
    { name: "GetBoostsStatus", constructorId: 70197089, argsConfig: { peer: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputPeer", useVectorId: null } }, subclassOfId: 3273333433, result: "premium.BoostsStatus", isFunction: true, namespace: "premium" },
    { name: "GetUserBoosts", constructorId: 965037343, argsConfig: { peer: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputPeer", useVectorId: null }, userId: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputUser", useVectorId: null } }, subclassOfId: 573941949, result: "premium.BoostsList", isFunction: true, namespace: "premium" },
    { name: "IsEligibleToJoin", constructorId: 249313744, argsConfig: {}, subclassOfId: 1589076134, result: "smsjobs.EligibilityToJoin", isFunction: true, namespace: "smsjobs" },
    { name: "Join", constructorId: 2806959661, argsConfig: {}, subclassOfId: 4122188204, result: "Bool", isFunction: true, namespace: "smsjobs" },
    { name: "Leave", constructorId: 2560142707, argsConfig: {}, subclassOfId: 4122188204, result: "Bool", isFunction: true, namespace: "smsjobs" },
    { name: "UpdateSettings", constructorId: 155164863, argsConfig: { flags: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: true, type: null, useVectorId: null }, allowInternational: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 0, flagIndicator: false, type: "true", useVectorId: null } }, subclassOfId: 4122188204, result: "Bool", isFunction: true, namespace: "smsjobs" },
    { name: "GetStatus", constructorId: 279353576, argsConfig: {}, subclassOfId: 3448711973, result: "smsjobs.Status", isFunction: true, namespace: "smsjobs" },
    { name: "GetSmsJob", constructorId: 2005766191, argsConfig: { jobId: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "string", useVectorId: null } }, subclassOfId: 522459262, result: "SmsJob", isFunction: true, namespace: "smsjobs" },
    { name: "FinishJob", constructorId: 1327415076, argsConfig: { flags: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: true, type: null, useVectorId: null }, jobId: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "string", useVectorId: null }, error: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 0, flagIndicator: false, type: "string", useVectorId: null } }, subclassOfId: 4122188204, result: "Bool", isFunction: true, namespace: "smsjobs" },
    { name: "GetCollectibleInfo", constructorId: 3189671354, argsConfig: { collectible: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputCollectible", useVectorId: null } }, subclassOfId: 3572127632, result: "fragment.CollectibleInfo", isFunction: true, namespace: "fragment" },
    { name: "CreateTone", constructorId: 1252538643, argsConfig: { flags: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: true, type: null, useVectorId: null }, displayAuthor: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 0, flagIndicator: false, type: "true", useVectorId: null }, emojiId: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "long", useVectorId: null }, title: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "string", useVectorId: null }, prompt: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "string", useVectorId: null } }, subclassOfId: 3564565261, result: "AiComposeTone", isFunction: true, namespace: "aicompose" },
    { name: "UpdateTone", constructorId: 2419838809, argsConfig: { flags: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: true, type: null, useVectorId: null }, tone: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputAiComposeTone", useVectorId: null }, displayAuthor: { isVector: false, isFlag: true, skipConstructorId: false, flagName: "flags", flagIndex: 0, flagIndicator: false, type: "Bool", useVectorId: null }, emojiId: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 1, flagIndicator: false, type: "long", useVectorId: null }, title: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 2, flagIndicator: false, type: "string", useVectorId: null }, prompt: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 3, flagIndicator: false, type: "string", useVectorId: null } }, subclassOfId: 3564565261, result: "AiComposeTone", isFunction: true, namespace: "aicompose" },
    { name: "SaveTone", constructorId: 394447793, argsConfig: { tone: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputAiComposeTone", useVectorId: null }, unsave: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "Bool", useVectorId: null } }, subclassOfId: 4122188204, result: "Bool", isFunction: true, namespace: "aicompose" },
    { name: "DeleteTone", constructorId: 3711512938, argsConfig: { tone: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputAiComposeTone", useVectorId: null } }, subclassOfId: 4122188204, result: "Bool", isFunction: true, namespace: "aicompose" },
    { name: "GetTone", constructorId: 3001596419, argsConfig: { tone: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputAiComposeTone", useVectorId: null } }, subclassOfId: 4066377433, result: "aicompose.Tones", isFunction: true, namespace: "aicompose" },
    { name: "GetTones", constructorId: 2882900481, argsConfig: { hash: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "long", useVectorId: null } }, subclassOfId: 4066377433, result: "aicompose.Tones", isFunction: true, namespace: "aicompose" },
    { name: "GetToneExample", constructorId: 3518278420, argsConfig: { tone: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputAiComposeTone", useVectorId: null }, num: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "int", useVectorId: null } }, subclassOfId: 2351207381, result: "AiComposeToneExample", isFunction: true, namespace: "aicompose" },
    { name: "Create", constructorId: 2788710892, argsConfig: { flags: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: true, type: null, useVectorId: null }, hidden: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 1, flagIndicator: false, type: "true", useVectorId: null }, title: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "string", useVectorId: null }, about: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 0, flagIndicator: false, type: "string", useVectorId: null }, peer: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputPeer", useVectorId: null } }, subclassOfId: 2331323052, result: "Updates", isFunction: true, namespace: "communities" },
    { name: "TogglePeerLink", constructorId: 1936576490, argsConfig: { flags: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: true, type: null, useVectorId: null }, visible: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 0, flagIndicator: false, type: "true", useVectorId: null }, hidden: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 1, flagIndicator: false, type: "true", useVectorId: null }, deleted: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 2, flagIndicator: false, type: "true", useVectorId: null }, community: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputChannel", useVectorId: null }, peer: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputPeer", useVectorId: null } }, subclassOfId: 4122188204, result: "Bool", isFunction: true, namespace: "communities" },
    { name: "GetJoinedCommunities", constructorId: 2791565360, argsConfig: {}, subclassOfId: 2580925204, result: "messages.Chats", isFunction: true, namespace: "communities" },
    { name: "ToggleCommunityCollapsedInDialogs", constructorId: 3613844458, argsConfig: { flags: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: true, type: null, useVectorId: null }, collapsed: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 0, flagIndicator: false, type: "true", useVectorId: null }, community: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputChannel", useVectorId: null } }, subclassOfId: 2331323052, result: "Updates", isFunction: true, namespace: "communities" },
    { name: "GetPeerLinkRequests", constructorId: 2474062660, argsConfig: { community: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputChannel", useVectorId: null }, offset: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "string", useVectorId: null }, limit: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "int", useVectorId: null } }, subclassOfId: 1135216367, result: "communities.PeerLinkRequests", isFunction: true, namespace: "communities" },
    { name: "TogglePeerLinkRequestApproval", constructorId: 2357336488, argsConfig: { flags: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: true, type: null, useVectorId: null }, reject: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 0, flagIndicator: false, type: "true", useVectorId: null }, community: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputChannel", useVectorId: null }, peer: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputPeer", useVectorId: null } }, subclassOfId: 4122188204, result: "Bool", isFunction: true, namespace: "communities" },
    { name: "ToggleAllPeerLinkRequestApproval", constructorId: 3219381565, argsConfig: { flags: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: true, type: null, useVectorId: null }, reject: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 0, flagIndicator: false, type: "true", useVectorId: null }, community: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputChannel", useVectorId: null } }, subclassOfId: 4122188204, result: "Bool", isFunction: true, namespace: "communities" },
    { name: "ToggleParticipantBanned", constructorId: 2573708559, argsConfig: { flags: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: true, type: null, useVectorId: null }, unban: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 0, flagIndicator: false, type: "true", useVectorId: null }, community: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputChannel", useVectorId: null }, participant: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputPeer", useVectorId: null } }, subclassOfId: 4122188204, result: "Bool", isFunction: true, namespace: "communities" },
    { name: "GetParticipantJoinedChats", constructorId: 4169051051, argsConfig: { community: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputChannel", useVectorId: null }, participant: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputPeer", useVectorId: null } }, subclassOfId: 2262480277, result: "communities.ParticipantJoinedChats", isFunction: true, namespace: "communities" },
    { name: "SendMessage", constructorId: 3129827125, argsConfig: { flags: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: true, type: null, useVectorId: null }, invertMedia: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 6, flagIndicator: false, type: "true", useVectorId: null }, welcome: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 7, flagIndicator: false, type: "true", useVectorId: null }, anchor: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 9, flagIndicator: false, type: "true", useVectorId: null }, noforwards: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 10, flagIndicator: false, type: "true", useVectorId: null }, peer: { isVector: false, isFlag: true, skipConstructorId: false, flagName: "flags", flagIndex: 8, flagIndicator: false, type: "InputPeer", useVectorId: null }, receiverId: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputUser", useVectorId: null }, queryId: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 0, flagIndicator: false, type: "long", useVectorId: null }, message: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "string", useVectorId: null }, entities: { isVector: true, isFlag: true, skipConstructorId: false, flagName: "flags", flagIndex: 1, flagIndicator: false, type: "MessageEntity", useVectorId: true }, media: { isVector: false, isFlag: true, skipConstructorId: false, flagName: "flags", flagIndex: 2, flagIndicator: false, type: "InputMedia", useVectorId: null }, replyMarkup: { isVector: false, isFlag: true, skipConstructorId: false, flagName: "flags", flagIndex: 3, flagIndicator: false, type: "ReplyMarkup", useVectorId: null }, richMessage: { isVector: false, isFlag: true, skipConstructorId: false, flagName: "flags", flagIndex: 4, flagIndicator: false, type: "InputRichMessage", useVectorId: null }, randomId: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "long", useVectorId: null }, replyTo: { isVector: false, isFlag: true, skipConstructorId: false, flagName: "flags", flagIndex: 5, flagIndicator: false, type: "InputReplyTo", useVectorId: null } }, subclassOfId: 2331323052, result: "Updates", isFunction: true, namespace: "ephemeral" },
    { name: "DeleteMessage", constructorId: 2465654679, argsConfig: { flags: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: true, type: null, useVectorId: null }, peer: { isVector: false, isFlag: true, skipConstructorId: false, flagName: "flags", flagIndex: 0, flagIndicator: false, type: "InputPeer", useVectorId: null }, receiverId: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputUser", useVectorId: null }, id: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "int", useVectorId: null } }, subclassOfId: 4122188204, result: "Bool", isFunction: true, namespace: "ephemeral" },
    { name: "ReportMessage", constructorId: 2265248447, argsConfig: { peer: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputPeer", useVectorId: null }, id: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "int", useVectorId: null }, option: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "bytes", useVectorId: null }, message: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "string", useVectorId: null } }, subclassOfId: 2899571768, result: "ReportResult", isFunction: true, namespace: "ephemeral" },
    { name: "GetCallbackAnswer", constructorId: 1067738312, argsConfig: { flags: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: true, type: null, useVectorId: null }, peer: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputPeer", useVectorId: null }, id: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "int", useVectorId: null }, data: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 1, flagIndicator: false, type: "bytes", useVectorId: null } }, subclassOfId: 1817039244, result: "messages.BotCallbackAnswer", isFunction: true, namespace: "ephemeral" },
    { name: "EditMessage", constructorId: 3483136603, argsConfig: { flags: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: true, type: null, useVectorId: null }, invertMedia: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 5, flagIndicator: false, type: "true", useVectorId: null }, welcome: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 6, flagIndicator: false, type: "true", useVectorId: null }, peer: { isVector: false, isFlag: true, skipConstructorId: false, flagName: "flags", flagIndex: 7, flagIndicator: false, type: "InputPeer", useVectorId: null }, receiverId: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputUser", useVectorId: null }, id: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "int", useVectorId: null }, message: { isVector: false, isFlag: true, skipConstructorId: true, flagName: "flags", flagIndex: 0, flagIndicator: false, type: "string", useVectorId: null }, media: { isVector: false, isFlag: true, skipConstructorId: false, flagName: "flags", flagIndex: 3, flagIndicator: false, type: "InputMedia", useVectorId: null }, entities: { isVector: true, isFlag: true, skipConstructorId: false, flagName: "flags", flagIndex: 1, flagIndicator: false, type: "MessageEntity", useVectorId: true }, replyMarkup: { isVector: false, isFlag: true, skipConstructorId: false, flagName: "flags", flagIndex: 2, flagIndicator: false, type: "ReplyMarkup", useVectorId: null }, richMessage: { isVector: false, isFlag: true, skipConstructorId: false, flagName: "flags", flagIndex: 4, flagIndicator: false, type: "InputRichMessage", useVectorId: null } }, subclassOfId: 2331323052, result: "Updates", isFunction: true, namespace: "ephemeral" },
    { name: "DeleteWelcomeMessage", constructorId: 3900877281, argsConfig: { peer: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputPeer", useVectorId: null }, id: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "int", useVectorId: null } }, subclassOfId: 4122188204, result: "Bool", isFunction: true, namespace: "ephemeral" },
    { name: "DeleteAllWelcomeMessages", constructorId: 1934595873, argsConfig: { peer: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputPeer", useVectorId: null } }, subclassOfId: 4122188204, result: "Bool", isFunction: true, namespace: "ephemeral" },
    { name: "GetWelcomeMessages", constructorId: 3684352397, argsConfig: { peer: { isVector: false, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "InputPeer", useVectorId: null }, hash: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "long", useVectorId: null } }, subclassOfId: 1869912621, result: "ephemeral.WelcomeMessages", isFunction: true, namespace: "ephemeral" },
    { name: "ResPQ", constructorId: 85337187, argsConfig: { nonce: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "int128", useVectorId: null }, serverNonce: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "int128", useVectorId: null }, pq: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "bytes", useVectorId: null }, serverPublicKeyFingerprints: { isVector: true, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "long", useVectorId: true } }, subclassOfId: 2020181688, result: "ResPQ", isFunction: false },
    { name: "PQInnerData", constructorId: 2211011308, argsConfig: { pq: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "bytes", useVectorId: null }, p: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "bytes", useVectorId: null }, q: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "bytes", useVectorId: null }, nonce: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "int128", useVectorId: null }, serverNonce: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "int128", useVectorId: null }, newNonce: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "int256", useVectorId: null } }, subclassOfId: 1097864055, result: "P_Q_inner_data", isFunction: false },
    { name: "PQInnerDataDc", constructorId: 2851430293, argsConfig: { pq: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "bytes", useVectorId: null }, p: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "bytes", useVectorId: null }, q: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "bytes", useVectorId: null }, nonce: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "int128", useVectorId: null }, serverNonce: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "int128", useVectorId: null }, newNonce: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "int256", useVectorId: null }, dc: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "int", useVectorId: null } }, subclassOfId: 1097864055, result: "P_Q_inner_data", isFunction: false },
    { name: "PQInnerDataTemp", constructorId: 1013613780, argsConfig: { pq: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "bytes", useVectorId: null }, p: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "bytes", useVectorId: null }, q: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "bytes", useVectorId: null }, nonce: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "int128", useVectorId: null }, serverNonce: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "int128", useVectorId: null }, newNonce: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "int256", useVectorId: null }, expiresIn: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "int", useVectorId: null } }, subclassOfId: 1097864055, result: "P_Q_inner_data", isFunction: false },
    { name: "PQInnerDataTempDc", constructorId: 1459478408, argsConfig: { pq: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "bytes", useVectorId: null }, p: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "bytes", useVectorId: null }, q: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "bytes", useVectorId: null }, nonce: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "int128", useVectorId: null }, serverNonce: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "int128", useVectorId: null }, newNonce: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "int256", useVectorId: null }, dc: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "int", useVectorId: null }, expiresIn: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "int", useVectorId: null } }, subclassOfId: 1097864055, result: "P_Q_inner_data", isFunction: false },
    { name: "BindAuthKeyInner", constructorId: 1973679973, argsConfig: { nonce: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "long", useVectorId: null }, tempAuthKeyId: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "long", useVectorId: null }, permAuthKeyId: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "long", useVectorId: null }, tempSessionId: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "long", useVectorId: null }, expiresAt: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "int", useVectorId: null } }, subclassOfId: 789156209, result: "BindAuthKeyInner", isFunction: false },
    { name: "ServerDHParamsFail", constructorId: 2043348061, argsConfig: { nonce: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "int128", useVectorId: null }, serverNonce: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "int128", useVectorId: null }, newNonceHash: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "int128", useVectorId: null } }, subclassOfId: 2786626974, result: "Server_DH_Params", isFunction: false },
    { name: "ServerDHParamsOk", constructorId: 3504867164, argsConfig: { nonce: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "int128", useVectorId: null }, serverNonce: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "int128", useVectorId: null }, encryptedAnswer: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "bytes", useVectorId: null } }, subclassOfId: 2786626974, result: "Server_DH_Params", isFunction: false },
    { name: "ServerDHInnerData", constructorId: 3045658042, argsConfig: { nonce: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "int128", useVectorId: null }, serverNonce: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "int128", useVectorId: null }, g: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "int", useVectorId: null }, dhPrime: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "bytes", useVectorId: null }, gA: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "bytes", useVectorId: null }, serverTime: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "int", useVectorId: null } }, subclassOfId: 3332007868, result: "Server_DH_inner_data", isFunction: false },
    { name: "ClientDHInnerData", constructorId: 1715713620, argsConfig: { nonce: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "int128", useVectorId: null }, serverNonce: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "int128", useVectorId: null }, retryId: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "long", useVectorId: null }, gB: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "bytes", useVectorId: null } }, subclassOfId: 4176408426, result: "Client_DH_Inner_Data", isFunction: false },
    { name: "DhGenOk", constructorId: 1003222836, argsConfig: { nonce: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "int128", useVectorId: null }, serverNonce: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "int128", useVectorId: null }, newNonceHash1: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "int128", useVectorId: null } }, subclassOfId: 1440574683, result: "Set_client_DH_params_answer", isFunction: false },
    { name: "DhGenRetry", constructorId: 1188831161, argsConfig: { nonce: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "int128", useVectorId: null }, serverNonce: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "int128", useVectorId: null }, newNonceHash2: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "int128", useVectorId: null } }, subclassOfId: 1440574683, result: "Set_client_DH_params_answer", isFunction: false },
    { name: "DhGenFail", constructorId: 2795351554, argsConfig: { nonce: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "int128", useVectorId: null }, serverNonce: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "int128", useVectorId: null }, newNonceHash3: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "int128", useVectorId: null } }, subclassOfId: 1440574683, result: "Set_client_DH_params_answer", isFunction: false },
    { name: "DestroyAuthKeyOk", constructorId: 4133544404, argsConfig: {}, subclassOfId: 2190599822, result: "DestroyAuthKeyRes", isFunction: false },
    { name: "DestroyAuthKeyNone", constructorId: 178201177, argsConfig: {}, subclassOfId: 2190599822, result: "DestroyAuthKeyRes", isFunction: false },
    { name: "DestroyAuthKeyFail", constructorId: 3926956819, argsConfig: {}, subclassOfId: 2190599822, result: "DestroyAuthKeyRes", isFunction: false },
    { name: "ReqPq", constructorId: 1615239032, argsConfig: { nonce: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "int128", useVectorId: null } }, subclassOfId: 2020181688, result: "ResPQ", isFunction: true },
    { name: "ReqPqMulti", constructorId: 3195965169, argsConfig: { nonce: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "int128", useVectorId: null } }, subclassOfId: 2020181688, result: "ResPQ", isFunction: true },
    { name: "ReqDHParams", constructorId: 3608339646, argsConfig: { nonce: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "int128", useVectorId: null }, serverNonce: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "int128", useVectorId: null }, p: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "bytes", useVectorId: null }, q: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "bytes", useVectorId: null }, publicKeyFingerprint: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "long", useVectorId: null }, encryptedData: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "bytes", useVectorId: null } }, subclassOfId: 2786626974, result: "Server_DH_Params", isFunction: true },
    { name: "SetClientDHParams", constructorId: 4110704415, argsConfig: { nonce: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "int128", useVectorId: null }, serverNonce: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "int128", useVectorId: null }, encryptedData: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "bytes", useVectorId: null } }, subclassOfId: 1440574683, result: "Set_client_DH_params_answer", isFunction: true },
    { name: "DestroyAuthKey", constructorId: 3510849888, argsConfig: {}, subclassOfId: 2190599822, result: "DestroyAuthKeyRes", isFunction: true },
    { name: "MsgsAck", constructorId: 1658238041, argsConfig: { msgIds: { isVector: true, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "long", useVectorId: true } }, subclassOfId: 2188801988, result: "MsgsAck", isFunction: false },
    { name: "BadMsgNotification", constructorId: 2817521681, argsConfig: { badMsgId: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "long", useVectorId: null }, badMsgSeqno: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "int", useVectorId: null }, errorCode: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "int", useVectorId: null } }, subclassOfId: 3468337495, result: "BadMsgNotification", isFunction: false },
    { name: "BadServerSalt", constructorId: 3987424379, argsConfig: { badMsgId: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "long", useVectorId: null }, badMsgSeqno: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "int", useVectorId: null }, errorCode: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "int", useVectorId: null }, newServerSalt: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "long", useVectorId: null } }, subclassOfId: 3468337495, result: "BadMsgNotification", isFunction: false },
    { name: "MsgsStateReq", constructorId: 3664378706, argsConfig: { msgIds: { isVector: true, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "long", useVectorId: true } }, subclassOfId: 418389456, result: "MsgsStateReq", isFunction: false },
    { name: "MsgsStateInfo", constructorId: 81704317, argsConfig: { reqMsgId: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "long", useVectorId: null }, info: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "string", useVectorId: null } }, subclassOfId: 118098532, result: "MsgsStateInfo", isFunction: false },
    { name: "MsgsAllInfo", constructorId: 2361446705, argsConfig: { msgIds: { isVector: true, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "long", useVectorId: true }, info: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "string", useVectorId: null } }, subclassOfId: 4203727700, result: "MsgsAllInfo", isFunction: false },
    { name: "MsgDetailedInfo", constructorId: 661470918, argsConfig: { msgId: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "long", useVectorId: null }, answerMsgId: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "long", useVectorId: null }, bytes: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "int", useVectorId: null }, status: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "int", useVectorId: null } }, subclassOfId: 1597167086, result: "MsgDetailedInfo", isFunction: false },
    { name: "MsgNewDetailedInfo", constructorId: 2157819615, argsConfig: { answerMsgId: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "long", useVectorId: null }, bytes: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "int", useVectorId: null }, status: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "int", useVectorId: null } }, subclassOfId: 1597167086, result: "MsgDetailedInfo", isFunction: false },
    { name: "MsgResendReq", constructorId: 2105940488, argsConfig: { msgIds: { isVector: true, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "long", useVectorId: true } }, subclassOfId: 33703188, result: "MsgResendReq", isFunction: false },
    { name: "RpcError", constructorId: 558156313, argsConfig: { errorCode: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "int", useVectorId: null }, errorMessage: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "string", useVectorId: null } }, subclassOfId: 1243079269, result: "RpcError", isFunction: false },
    { name: "RpcAnswerUnknown", constructorId: 1579864942, argsConfig: {}, subclassOfId: 1271559536, result: "RpcDropAnswer", isFunction: false },
    { name: "RpcAnswerDroppedRunning", constructorId: 3447252358, argsConfig: {}, subclassOfId: 1271559536, result: "RpcDropAnswer", isFunction: false },
    { name: "RpcAnswerDropped", constructorId: 2755319991, argsConfig: { msgId: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "long", useVectorId: null }, seqNo: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "int", useVectorId: null }, bytes: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "int", useVectorId: null } }, subclassOfId: 1271559536, result: "RpcDropAnswer", isFunction: false },
    { name: "FutureSalt", constructorId: 155834844, argsConfig: { validSince: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "int", useVectorId: null }, validUntil: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "int", useVectorId: null }, salt: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "long", useVectorId: null } }, subclassOfId: 1172651471, result: "FutureSalt", isFunction: false },
    { name: "FutureSalts", constructorId: 2924480661, argsConfig: { reqMsgId: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "long", useVectorId: null }, now: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "int", useVectorId: null }, salts: { isVector: true, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "FutureSalt", useVectorId: false } }, subclassOfId: 277935383, result: "FutureSalts", isFunction: false },
    { name: "Pong", constructorId: 880243653, argsConfig: { msgId: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "long", useVectorId: null }, pingId: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "long", useVectorId: null } }, subclassOfId: 2171268721, result: "Pong", isFunction: false },
    { name: "DestroySessionOk", constructorId: 3793765884, argsConfig: { sessionId: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "long", useVectorId: null } }, subclassOfId: 2936858557, result: "DestroySessionRes", isFunction: false },
    { name: "DestroySessionNone", constructorId: 1658015945, argsConfig: { sessionId: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "long", useVectorId: null } }, subclassOfId: 2936858557, result: "DestroySessionRes", isFunction: false },
    { name: "NewSessionCreated", constructorId: 2663516424, argsConfig: { firstMsgId: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "long", useVectorId: null }, uniqueId: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "long", useVectorId: null }, serverSalt: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "long", useVectorId: null } }, subclassOfId: 1359818801, result: "NewSession", isFunction: false },
    { name: "HttpWait", constructorId: 2459514271, argsConfig: { maxDelay: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "int", useVectorId: null }, waitAfter: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "int", useVectorId: null }, maxWait: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "int", useVectorId: null } }, subclassOfId: 310685398, result: "HttpWait", isFunction: false },
    { name: "IpPort", constructorId: 3560156531, argsConfig: { ipv4: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "int", useVectorId: null }, port: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "int", useVectorId: null } }, subclassOfId: 2728408870, result: "IpPort", isFunction: false },
    { name: "IpPortSecret", constructorId: 932718150, argsConfig: { ipv4: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "int", useVectorId: null }, port: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "int", useVectorId: null }, secret: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "bytes", useVectorId: null } }, subclassOfId: 2728408870, result: "IpPort", isFunction: false },
    { name: "AccessPointRule", constructorId: 1182381663, argsConfig: { phonePrefixRules: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "string", useVectorId: null }, dcId: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "int", useVectorId: null }, ips: { isVector: true, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "IpPort", useVectorId: false } }, subclassOfId: 2980880637, result: "AccessPointRule", isFunction: false },
    { name: "ConfigSimple", constructorId: 1515793004, argsConfig: { date: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "int", useVectorId: null }, expires: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "int", useVectorId: null }, rules: { isVector: true, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "AccessPointRule", useVectorId: false } }, subclassOfId: 689453764, result: "help.ConfigSimple", isFunction: false, namespace: "help" },
    { name: "TlsClientHello", constructorId: 262524817, argsConfig: { blocks: { isVector: true, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "TlsBlock", useVectorId: false } }, subclassOfId: 3203533088, result: "TlsClientHello", isFunction: false },
    { name: "TlsBlockString", constructorId: 1488907607, argsConfig: { data: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "string", useVectorId: null } }, subclassOfId: 4044764304, result: "TlsBlock", isFunction: false },
    { name: "TlsBlockRandom", constructorId: 3265966728, argsConfig: { length: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "int", useVectorId: null } }, subclassOfId: 4044764304, result: "TlsBlock", isFunction: false },
    { name: "TlsBlockZero", constructorId: 3400654219, argsConfig: { length: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "int", useVectorId: null } }, subclassOfId: 4044764304, result: "TlsBlock", isFunction: false },
    { name: "TlsBlockDomain", constructorId: 283665263, argsConfig: {}, subclassOfId: 4044764304, result: "TlsBlock", isFunction: false },
    { name: "TlsBlockGrease", constructorId: 2623335513, argsConfig: { seed: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "int", useVectorId: null } }, subclassOfId: 4044764304, result: "TlsBlock", isFunction: false },
    { name: "TlsBlockPublicKey", constructorId: 2662947676, argsConfig: {}, subclassOfId: 4044764304, result: "TlsBlock", isFunction: false },
    { name: "TlsBlockScope", constructorId: 3638474097, argsConfig: { entries: { isVector: true, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "TlsBlock", useVectorId: true } }, subclassOfId: 4044764304, result: "TlsBlock", isFunction: false },
    { name: "TlsBlockPermutation", constructorId: 48631757, argsConfig: { entries: { isVector: true, isFlag: false, skipConstructorId: false, flagName: null, flagIndex: -1, flagIndicator: false, type: "TlsBlock", useVectorId: true } }, subclassOfId: 4044764304, result: "TlsBlock", isFunction: false },
    { name: "TlsBlockM", constructorId: 2648724363, argsConfig: {}, subclassOfId: 4044764304, result: "TlsBlock", isFunction: false },
    { name: "TlsBlockE", constructorId: 2615944565, argsConfig: {}, subclassOfId: 4044764304, result: "TlsBlock", isFunction: false },
    { name: "TlsBlockPadding", constructorId: 2754966040, argsConfig: {}, subclassOfId: 4044764304, result: "TlsBlock", isFunction: false },
    { name: "RpcDropAnswer", constructorId: 1491380032, argsConfig: { reqMsgId: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "long", useVectorId: null } }, subclassOfId: 1271559536, result: "RpcDropAnswer", isFunction: true },
    { name: "GetFutureSalts", constructorId: 3105996036, argsConfig: { num: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "int", useVectorId: null } }, subclassOfId: 277935383, result: "FutureSalts", isFunction: true },
    { name: "Ping", constructorId: 2059302892, argsConfig: { pingId: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "long", useVectorId: null } }, subclassOfId: 2171268721, result: "Pong", isFunction: true },
    { name: "PingDelayDisconnect", constructorId: 4081220492, argsConfig: { pingId: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "long", useVectorId: null }, disconnectDelay: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "int", useVectorId: null } }, subclassOfId: 2171268721, result: "Pong", isFunction: true },
    { name: "DestroySession", constructorId: 3880853798, argsConfig: { sessionId: { isVector: false, isFlag: false, skipConstructorId: true, flagName: null, flagIndex: -1, flagIndicator: false, type: "long", useVectorId: null } }, subclassOfId: 2936858557, result: "DestroySessionRes", isFunction: true }
  ];
});

// node_modules/teleproto/tl/generated/api.js
var require_api = __commonJS((exports2, module2) => {
  var { createApiFromDefinitions } = require_createApi();
  var definitions = require_api_definitions();
  var Api = createApiFromDefinitions(definitions);
  module2.exports = { Api };
});

// node_modules/teleproto/tl/api.js
var require_api2 = __commonJS((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2.Api = undefined;
  var api_1 = require_api();
  Object.defineProperty(exports2, "Api", { enumerable: true, get: function() {
    return api_1.Api;
  } });
});

// node_modules/teleproto/tl/runtime/registry.js
var require_registry = __commonJS((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2.tlobjects = exports2.LAYER = undefined;
  exports2.LAYER = 229;
  var api_1 = require_api2();
  var tlobjects = {};
  exports2.tlobjects = tlobjects;
  for (const tl of Object.values(api_1.Api)) {
    if ("CONSTRUCTOR_ID" in tl) {
      tlobjects[tl.CONSTRUCTOR_ID] = tl;
    } else {
      for (const sub of Object.values(tl)) {
        tlobjects[sub.CONSTRUCTOR_ID] = sub;
      }
    }
  }
});

// node_modules/teleproto/tl/index.js
var require_tl = __commonJS((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2.tlobjects = exports2.LAYER = exports2.serializeDate = exports2.serializeBytes = exports2.Api = undefined;
  var api_1 = require_api();
  Object.defineProperty(exports2, "Api", { enumerable: true, get: function() {
    return api_1.Api;
  } });
  var helpers_1 = require_helpers();
  Object.defineProperty(exports2, "serializeBytes", { enumerable: true, get: function() {
    return helpers_1.serializeBytes;
  } });
  Object.defineProperty(exports2, "serializeDate", { enumerable: true, get: function() {
    return helpers_1.serializeDate;
  } });
  var registry_1 = require_registry();
  Object.defineProperty(exports2, "LAYER", { enumerable: true, get: function() {
    return registry_1.LAYER;
  } });
  Object.defineProperty(exports2, "tlobjects", { enumerable: true, get: function() {
    return registry_1.tlobjects;
  } });
});

// node_modules/teleproto/richMessage.js
var require_richMessage = __commonJS((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2.html = html;
  exports2.markdown = markdown;
  exports2.blocks = blocks;
  exports2.renderRichText = renderRichText;
  exports2.renderBlocks = renderBlocks;
  exports2.toPlainText = toPlainText;
  exports2.toMarkdown = toMarkdown;
  exports2.toHtml = toHtml;
  var api_1 = require_api2();
  var Helpers_1 = require_Helpers();
  function _toRichFiles(files) {
    if (!files) {
      return;
    }
    const result = [];
    for (const [id, media] of Object.entries(files)) {
      if (media.SUBCLASS_OF_ID === (0, Helpers_1.unionId)("InputPhoto")) {
        result.push(new api_1.Api.InputRichFilePhoto({
          id,
          photo: media
        }));
      } else {
        result.push(new api_1.Api.InputRichFileDocument({
          id,
          document: media
        }));
      }
    }
    return result.length ? result : undefined;
  }
  function html(content, options = {}) {
    return new api_1.Api.InputRichMessageHTML({
      html: content,
      rtl: options.rtl,
      noautolink: options.noAutolink,
      files: _toRichFiles(options.files)
    });
  }
  function markdown(content, options = {}) {
    return new api_1.Api.InputRichMessageMarkdown({
      markdown: content,
      rtl: options.rtl,
      noautolink: options.noAutolink,
      files: _toRichFiles(options.files)
    });
  }
  function blocks(pageBlocks, options = {}) {
    return new api_1.Api.InputRichMessage({
      blocks: pageBlocks,
      rtl: options.rtl,
      noautolink: options.noAutolink,
      photos: options.photos,
      documents: options.documents,
      users: options.users
    });
  }
  function _escapeHtml(text) {
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function _escapeMd(text) {
    return text.replace(/([\\`*_[\]|~])/g, "\\$1");
  }
  function _plain(text, mode) {
    if (mode === "html") {
      return _escapeHtml(text);
    }
    if (mode === "md") {
      return _escapeMd(text);
    }
    return text;
  }
  function _tag(inner, mode, htmlTag, md) {
    if (mode === "html") {
      return `<${htmlTag}>${inner}</${htmlTag}>`;
    }
    if (mode === "md") {
      return `${md}${inner}${md}`;
    }
    return inner;
  }
  function _buttonUrl(type) {
    if (type instanceof api_1.Api.InlineButtonTypeUrl || type instanceof api_1.Api.InlineButtonTypeUrlAuth || type instanceof api_1.Api.InputInlineButtonTypeUrlAuth || type instanceof api_1.Api.InlineButtonTypeWebView) {
      return type.url;
    }
    return;
  }
  function _renderButton(text, type, mode) {
    const inner = renderRichText(text, mode);
    const url = _buttonUrl(type);
    if (mode === "html") {
      return url ? `<a class="button" href="${_escapeHtml(url)}">${inner}</a>` : `<button>${inner}</button>`;
    }
    if (mode === "md" && url) {
      return `[${inner}](${url})`;
    }
    return inner;
  }
  function renderRichText(text, mode = "text") {
    if (!text || text instanceof api_1.Api.TextEmpty) {
      return "";
    }
    if (text instanceof api_1.Api.TextPlain) {
      return _plain(text.text, mode);
    }
    if (text instanceof api_1.Api.TextConcat) {
      return text.texts.map((t) => renderRichText(t, mode)).join("");
    }
    if (text instanceof api_1.Api.TextBold) {
      return _tag(renderRichText(text.text, mode), mode, "b", "**");
    }
    if (text instanceof api_1.Api.TextItalic) {
      return _tag(renderRichText(text.text, mode), mode, "i", "_");
    }
    if (text instanceof api_1.Api.TextUnderline) {
      return mode === "html" ? `<u>${renderRichText(text.text, mode)}</u>` : renderRichText(text.text, mode);
    }
    if (text instanceof api_1.Api.TextStrike) {
      return _tag(renderRichText(text.text, mode), mode, "s", "~~");
    }
    if (text instanceof api_1.Api.TextFixed) {
      return _tag(renderRichText(text.text, mode), mode, "code", "`");
    }
    if (text instanceof api_1.Api.TextMarked) {
      return mode === "html" ? `<mark>${renderRichText(text.text, mode)}</mark>` : renderRichText(text.text, mode);
    }
    if (text instanceof api_1.Api.TextSpoiler) {
      const inner = renderRichText(text.text, mode);
      if (mode === "html") {
        return `<span class="spoiler">${inner}</span>`;
      }
      if (mode === "md") {
        return `||${inner}||`;
      }
      return inner;
    }
    if (text instanceof api_1.Api.TextSubscript) {
      return mode === "html" ? `<sub>${renderRichText(text.text, mode)}</sub>` : renderRichText(text.text, mode);
    }
    if (text instanceof api_1.Api.TextSuperscript) {
      return mode === "html" ? `<sup>${renderRichText(text.text, mode)}</sup>` : renderRichText(text.text, mode);
    }
    if (text instanceof api_1.Api.TextUrl) {
      const inner = renderRichText(text.text, mode);
      if (mode === "html") {
        return `<a href="${_escapeHtml(text.url)}">${inner}</a>`;
      }
      if (mode === "md") {
        return `[${inner}](${text.url})`;
      }
      return inner;
    }
    if (text instanceof api_1.Api.TextEmail) {
      const inner = renderRichText(text.text, mode);
      if (mode === "html") {
        return `<a href="mailto:${_escapeHtml(text.email)}">${inner}</a>`;
      }
      return inner;
    }
    if (text instanceof api_1.Api.TextPhone) {
      return renderRichText(text.text, mode);
    }
    if (text instanceof api_1.Api.TextAnchor) {
      const inner = renderRichText(text.text, mode);
      return mode === "html" ? `<a id="${_escapeHtml(text.name)}">${inner}</a>` : inner;
    }
    if (text instanceof api_1.Api.TextMentionName) {
      const inner = renderRichText(text.text, mode);
      if (mode === "html") {
        return `<a href="tg://user?id=${text.userId}">${inner}</a>`;
      }
      return inner;
    }
    if (text instanceof api_1.Api.TextCustomEmoji) {
      return _plain(text.alt, mode);
    }
    if (text instanceof api_1.Api.TextImage) {
      return mode === "html" ? `<img data-document-id="${text.documentId}">` : "";
    }
    if (text instanceof api_1.Api.TextMath) {
      return _tag(_plain(text.source, mode), mode, "code", "`");
    }
    if (text instanceof api_1.Api.TextDiff) {
      return renderRichText(text.text, mode);
    }
    if (text instanceof api_1.Api.TextButton) {
      return _renderButton(text.text, text.type, mode);
    }
    const nested = text.text;
    if (nested && typeof nested === "object") {
      return renderRichText(nested, mode);
    }
    return "";
  }
  function _renderCaption(caption, mode) {
    if (!caption || !(caption instanceof api_1.Api.PageCaption)) {
      return "";
    }
    const parts = [
      renderRichText(caption.text, mode),
      renderRichText(caption.credit, mode)
    ].filter(Boolean);
    return parts.join(mode === "html" ? " — " : " — ");
  }
  function _checkbox(item) {
    if (!item.checkbox) {
      return "";
    }
    return item.checked ? "[x] " : "[ ] ";
  }
  function _renderBlock(block, mode) {
    if (block instanceof api_1.Api.PageBlockTitle) {
      const inner = renderRichText(block.text, mode);
      if (mode === "html")
        return `<h1>${inner}</h1>`;
      if (mode === "md")
        return `# ${inner}`;
      return inner;
    }
    if (block instanceof api_1.Api.PageBlockSubtitle) {
      const inner = renderRichText(block.text, mode);
      if (mode === "html")
        return `<h2>${inner}</h2>`;
      if (mode === "md")
        return `## ${inner}`;
      return inner;
    }
    if (block instanceof api_1.Api.PageBlockHeader) {
      const inner = renderRichText(block.text, mode);
      if (mode === "html")
        return `<h3>${inner}</h3>`;
      if (mode === "md")
        return `### ${inner}`;
      return inner;
    }
    if (block instanceof api_1.Api.PageBlockSubheader) {
      const inner = renderRichText(block.text, mode);
      if (mode === "html")
        return `<h4>${inner}</h4>`;
      if (mode === "md")
        return `#### ${inner}`;
      return inner;
    }
    for (const [cls, level] of [
      [api_1.Api.PageBlockHeading1, 1],
      [api_1.Api.PageBlockHeading2, 2],
      [api_1.Api.PageBlockHeading3, 3],
      [api_1.Api.PageBlockHeading4, 4],
      [api_1.Api.PageBlockHeading5, 5],
      [api_1.Api.PageBlockHeading6, 6]
    ]) {
      if (block instanceof cls) {
        const inner = renderRichText(block.text, mode);
        if (mode === "html")
          return `<h${level}>${inner}</h${level}>`;
        if (mode === "md")
          return `${"#".repeat(level)} ${inner}`;
        return inner;
      }
    }
    if (block instanceof api_1.Api.PageBlockParagraph) {
      const inner = renderRichText(block.text, mode);
      return mode === "html" ? `<p>${inner}</p>` : inner;
    }
    if (block instanceof api_1.Api.PageBlockKicker) {
      const inner = renderRichText(block.text, mode);
      return mode === "html" ? `<p>${inner}</p>` : inner;
    }
    if (block instanceof api_1.Api.PageBlockFooter) {
      const inner = renderRichText(block.text, mode);
      return mode === "html" ? `<footer>${inner}</footer>` : inner;
    }
    if (block instanceof api_1.Api.PageBlockPreformatted) {
      if (mode === "html") {
        return `<pre>${renderRichText(block.text, "html")}</pre>`;
      }
      const raw = renderRichText(block.text, "text");
      if (mode === "md") {
        return "```" + (block.language || "") + `
` + raw + "\n```";
      }
      return raw;
    }
    if (block instanceof api_1.Api.PageBlockBlockquote || block instanceof api_1.Api.PageBlockPullquote) {
      const inner = renderRichText(block.text, mode);
      const caption = renderRichText(block.caption, mode);
      if (mode === "html") {
        return `<blockquote>${inner}${caption ? `<footer>${caption}</footer>` : ""}</blockquote>`;
      }
      if (mode === "md") {
        const quoted = inner.split(`
`).map((line) => `> ${line}`).join(`
`);
        return caption ? `${quoted}
> — ${caption}` : quoted;
      }
      return caption ? `${inner} — ${caption}` : inner;
    }
    if (block instanceof api_1.Api.PageBlockBlockquoteBlocks) {
      const inner = renderBlocks(block.blocks, mode);
      const caption = renderRichText(block.caption, mode);
      if (mode === "html") {
        return `<blockquote>${inner}${caption ? `<footer>${caption}</footer>` : ""}</blockquote>`;
      }
      if (mode === "md") {
        const quoted = inner.split(`
`).map((line) => `> ${line}`).join(`
`);
        return caption ? `${quoted}
> — ${caption}` : quoted;
      }
      return caption ? `${inner} — ${caption}` : inner;
    }
    if (block instanceof api_1.Api.PageBlockDivider) {
      if (mode === "html")
        return "<hr>";
      if (mode === "md")
        return "---";
      return "———";
    }
    if (block instanceof api_1.Api.PageBlockAnchor) {
      return mode === "html" ? `<a id="${_escapeHtml(block.name)}"></a>` : "";
    }
    if (block instanceof api_1.Api.PageBlockList) {
      const items = block.items.map((item) => {
        let inner = "";
        let check = "";
        if (item instanceof api_1.Api.PageListItemText) {
          inner = renderRichText(item.text, mode);
          check = _checkbox(item);
        } else if (item instanceof api_1.Api.PageListItemBlocks) {
          inner = renderBlocks(item.blocks, mode);
          check = _checkbox(item);
        }
        if (mode === "html")
          return `<li>${check}${inner}</li>`;
        return `- ${check}${inner}`;
      });
      if (mode === "html")
        return `<ul>${items.join("")}</ul>`;
      return items.join(`
`);
    }
    if (block instanceof api_1.Api.PageBlockOrderedList) {
      const items = block.items.map((item, index) => {
        let inner = "";
        let check = "";
        let num;
        if (item instanceof api_1.Api.PageListOrderedItemText) {
          inner = renderRichText(item.text, mode);
          check = _checkbox(item);
          num = item.num;
        } else if (item instanceof api_1.Api.PageListOrderedItemBlocks) {
          inner = renderBlocks(item.blocks, mode);
          check = _checkbox(item);
          num = item.num;
        }
        if (mode === "html")
          return `<li>${check}${inner}</li>`;
        return `${num ?? index + 1}. ${check}${inner}`;
      });
      if (mode === "html") {
        const start = block.start != null ? ` start="${block.start}"` : "";
        return `<ol${start}>${items.join("")}</ol>`;
      }
      return items.join(`
`);
    }
    if (block instanceof api_1.Api.PageBlockTable) {
      const title = renderRichText(block.title, mode);
      const rows = block.rows.map((row) => row.cells.map((cell) => cell.text ? renderRichText(cell.text, mode) : ""));
      if (mode === "html") {
        const body = block.rows.map((row, i) => {
          const cells = row.cells.map((cell) => {
            const tag = cell.header ? "th" : "td";
            const attrs = [
              cell.colspan ? ` colspan="${cell.colspan}"` : "",
              cell.rowspan ? ` rowspan="${cell.rowspan}"` : ""
            ].join("");
            const inner = cell.text ? renderRichText(cell.text, "html") : "";
            return `<${tag}${attrs}>${inner}</${tag}>`;
          }).join("");
          return `<tr>${cells}</tr>`;
        }).join("");
        return `${title ? `<p>${title}</p>` : ""}<table>${body}</table>`;
      }
      if (mode === "md" && rows.length) {
        const header = rows[0];
        const lines = [
          `| ${header.join(" | ")} |`,
          `| ${header.map(() => "---").join(" | ")} |`,
          ...rows.slice(1).map((cells) => `| ${cells.join(" | ")} |`)
        ];
        return (title ? `${title}
` : "") + lines.join(`
`);
      }
      return [title, ...rows.map((cells) => cells.join(" | "))].filter(Boolean).join(`
`);
    }
    if (block instanceof api_1.Api.PageBlockPhoto) {
      const caption = _renderCaption(block.caption, mode);
      if (mode === "html") {
        return `<figure><img data-photo-id="${block.photoId}">${caption ? `<figcaption>${caption}</figcaption>` : ""}</figure>`;
      }
      return caption ? `[photo: ${caption}]` : "[photo]";
    }
    if (block instanceof api_1.Api.PageBlockVideo) {
      const caption = _renderCaption(block.caption, mode);
      if (mode === "html") {
        return `<figure><video data-document-id="${block.videoId}"></video>${caption ? `<figcaption>${caption}</figcaption>` : ""}</figure>`;
      }
      return caption ? `[video: ${caption}]` : "[video]";
    }
    if (block instanceof api_1.Api.PageBlockAudio) {
      const caption = _renderCaption(block.caption, mode);
      if (mode === "html") {
        return `<audio data-document-id="${block.audioId}"></audio>`;
      }
      return caption ? `[audio: ${caption}]` : "[audio]";
    }
    if (block instanceof api_1.Api.PageBlockDocument) {
      const caption = _renderCaption(block.caption, mode);
      if (mode === "html") {
        return `<figure><a data-document-id="${block.documentId}"></a>${caption ? `<figcaption>${caption}</figcaption>` : ""}</figure>`;
      }
      return caption ? `[document: ${caption}]` : "[document]";
    }
    if (block instanceof api_1.Api.PageBlockCollage || block instanceof api_1.Api.PageBlockSlideshow) {
      const inner = renderBlocks(block.items, mode);
      const caption = _renderCaption(block.caption, mode);
      if (mode === "html") {
        return `<div>${inner}${caption ? `<figcaption>${caption}</figcaption>` : ""}</div>`;
      }
      return [inner, caption].filter(Boolean).join(`
`);
    }
    if (block instanceof api_1.Api.PageBlockCover) {
      return _renderBlock(block.cover, mode);
    }
    if (block instanceof api_1.Api.PageBlockDetails) {
      const title = renderRichText(block.title, mode);
      const inner = renderBlocks(block.blocks, mode);
      if (mode === "html") {
        return `<details${block.open ? " open" : ""}><summary>${title}</summary>${inner}</details>`;
      }
      return [title, inner].filter(Boolean).join(`
`);
    }
    if (block instanceof api_1.Api.PageBlockMath) {
      if (mode === "html")
        return `<code>${_escapeHtml(block.source)}</code>`;
      if (mode === "md")
        return "```\n" + block.source + "\n```";
      return block.source;
    }
    if (block instanceof api_1.Api.PageBlockThinking) {
      return renderRichText(block.text, mode);
    }
    if (block instanceof api_1.Api.PageBlockAuthorDate) {
      return renderRichText(block.author, mode);
    }
    if (block instanceof api_1.Api.PageBlockButtonRow) {
      const buttons = block.buttons.map((button) => button instanceof api_1.Api.PageButton ? _renderButton(button.text, button.type, mode) : "").filter(Boolean);
      if (mode === "html") {
        return `<div class="buttons">${buttons.join("")}</div>`;
      }
      return buttons.join(" ");
    }
    if (block instanceof api_1.Api.PageBlockUnsupported) {
      return "";
    }
    const anyBlock = block;
    if (anyBlock.text && typeof anyBlock.text === "object") {
      return renderRichText(anyBlock.text, mode);
    }
    if (Array.isArray(anyBlock.blocks)) {
      return renderBlocks(anyBlock.blocks, mode);
    }
    if (Array.isArray(anyBlock.items)) {
      return renderBlocks(anyBlock.items, mode);
    }
    return "";
  }
  function renderBlocks(pageBlocks, mode) {
    const parts = pageBlocks.map((block) => _renderBlock(block, mode)).filter((part) => part !== "");
    if (mode === "html") {
      return parts.join("");
    }
    return parts.join(`

`);
  }
  function _blocksOf(source) {
    return Array.isArray(source) ? source : source.blocks;
  }
  function toPlainText(source) {
    return renderBlocks(_blocksOf(source), "text");
  }
  function toMarkdown(source) {
    return renderBlocks(_blocksOf(source), "md");
  }
  function toHtml(source) {
    return renderBlocks(_blocksOf(source), "html");
  }
});

// node_modules/teleproto/Version.js
var require_Version = __commonJS((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2.version = undefined;
  exports2.version = "1.229.3";
});

// node_modules/teleproto/network/connection/Connection.js
var require_Connection = __commonJS((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2.ObfuscatedConnection = exports2.PacketCodec = exports2.Connection = undefined;

  class Connection {
    constructor({ ip, port, dcId, loggers, proxy, socket, keepAliveInterval, testServers }) {
      this._ip = ip;
      this._port = port;
      this._dcId = dcId;
      this._log = loggers;
      this._proxy = proxy;
      this._keepAliveInterval = keepAliveInterval;
      this._testServers = testServers;
      this._connected = false;
      this._codec = undefined;
      this._obfuscation = undefined;
      this.socket = new socket(proxy, keepAliveInterval);
    }
    async connect() {
      this._log.debug("Connecting");
      this._codec = new this.PacketCodecClass(this);
      await this.socket.connect(this._port, this._ip, this._testServers);
      this._log.debug("Finished connecting");
      await this._initConn();
      this._connected = true;
    }
    async disconnect() {
      if (!this._connected) {
        return;
      }
      this._connected = false;
      await this.socket.close();
    }
    async send(data) {
      if (!this._connected) {
        throw new Error("Not connected");
      }
      await this._send(data);
    }
    async recv() {
      if (!this._connected) {
        throw new Error("Not connected");
      }
      const data = await this._recv();
      if (!data || !data.length) {
        throw new Error("No data received");
      }
      return data;
    }
    isConnected() {
      return this._connected;
    }
    async _initConn() {
      if (this._codec.tag) {
        await this.socket.write(this._codec.tag);
      }
    }
    async _send(data) {
      const encodedPacket = this._codec.encodePacket(data);
      this.socket.write(encodedPacket);
    }
    async _recv() {
      return await this._codec.readPacket(this.socket);
    }
    toString() {
      return `${this._ip}:${this._port}/${this.constructor.name.replace("Connection", "")}`;
    }
  }
  exports2.Connection = Connection;

  class ObfuscatedConnection extends Connection {
    constructor() {
      super(...arguments);
      this.ObfuscatedIO = undefined;
    }
    async _initConn() {
      this._obfuscation = new this.ObfuscatedIO(this);
      await this._obfuscation.initHeader();
      this.socket.write(this._obfuscation.header);
    }
    async _send(data) {
      this._obfuscation.write(this._codec.encodePacket(data));
    }
    async _recv() {
      return await this._codec.readPacket(this._obfuscation);
    }
  }
  exports2.ObfuscatedConnection = ObfuscatedConnection;

  class PacketCodec {
    constructor(connection) {
      this._conn = connection;
    }
    encodePacket(data) {
      throw new Error("Not Implemented");
    }
    async readPacket(reader) {
      throw new Error("Not Implemented");
    }
  }
  exports2.PacketCodec = PacketCodec;
});

// node_modules/teleproto/errors/RPCBaseErrors.js
var require_RPCBaseErrors = __commonJS((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2.TimedOutError = exports2.ServerError = exports2.FloodError = exports2.AuthKeyError = exports2.NotFoundError = exports2.ForbiddenError = exports2.UnauthorizedError = exports2.BadRequestError = exports2.InvalidDCError = exports2.RPCError = undefined;

  class RPCError extends Error {
    constructor(message, request, code) {
      super("{0}: {1}{2}".replace("{0}", code?.toString() || "").replace("{1}", message || "").replace("{2}", RPCError._fmtRequest(request)));
      this.name = this.constructor.name;
      this.code = code;
      this.errorMessage = message;
    }
    static _fmtRequest(request) {
      if (request) {
        return ` (caused by ${request.className})`;
      } else {
        return "";
      }
    }
  }
  exports2.RPCError = RPCError;

  class InvalidDCError extends RPCError {
    constructor(message, request, code) {
      super(message, request, code);
      this.code = code || 303;
      this.errorMessage = message || "ERROR_SEE_OTHER";
    }
  }
  exports2.InvalidDCError = InvalidDCError;

  class BadRequestError extends RPCError {
    constructor() {
      super(...arguments);
      this.code = 400;
      this.errorMessage = "BAD_REQUEST";
    }
  }
  exports2.BadRequestError = BadRequestError;

  class UnauthorizedError extends RPCError {
    constructor() {
      super(...arguments);
      this.code = 401;
      this.errorMessage = "UNAUTHORIZED";
    }
  }
  exports2.UnauthorizedError = UnauthorizedError;

  class ForbiddenError extends RPCError {
    constructor() {
      super(...arguments);
      this.code = 403;
      this.errorMessage = "FORBIDDEN";
    }
  }
  exports2.ForbiddenError = ForbiddenError;

  class NotFoundError extends RPCError {
    constructor() {
      super(...arguments);
      this.code = 404;
      this.errorMessage = "NOT_FOUND";
    }
  }
  exports2.NotFoundError = NotFoundError;

  class AuthKeyError extends RPCError {
    constructor() {
      super(...arguments);
      this.code = 406;
      this.errorMessage = "AUTH_KEY";
    }
  }
  exports2.AuthKeyError = AuthKeyError;

  class FloodError extends RPCError {
    constructor() {
      super(...arguments);
      this.code = 420;
      this.errorMessage = "FLOOD";
    }
  }
  exports2.FloodError = FloodError;

  class ServerError extends RPCError {
    constructor() {
      super(...arguments);
      this.code = 500;
      this.errorMessage = "INTERNAL";
    }
  }
  exports2.ServerError = ServerError;

  class TimedOutError extends RPCError {
    constructor() {
      super(...arguments);
      this.code = 503;
      this.errorMessage = "Timeout";
    }
  }
  exports2.TimedOutError = TimedOutError;
});

// node_modules/teleproto/errors/RPCErrorList.js
var require_RPCErrorList = __commonJS((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2.BotDomainInvalidError = exports2.BotCreateLimitExceededError = exports2.BotCommandInvalidError = exports2.BotCommandDescriptionInvalidError = exports2.BotChannelsNaError = exports2.BotBusinessMissingError = exports2.BotAppShortnameInvalidError = exports2.BotAppInvalidError = exports2.BotAppBotInvalidError = exports2.BotAlreadyDisabledError = exports2.BoostsRequiredError = exports2.BoostsEmptyError = exports2.BoostPeerInvalidError = exports2.BoostNotModifiedError = exports2.BirthdayInvalidError = exports2.BirthdayAlreadyError = exports2.BannedRightsInvalidError = exports2.BankCardNumberInvalidError = exports2.BalanceTooLowError = exports2.AutoarchiveNotAvailableError = exports2.AuthTokenInvalidxError = exports2.AuthTokenInvalidError = exports2.AuthTokenExpiredError = exports2.AuthTokenExceptionError = exports2.AuthTokenAlreadyAcceptedError = exports2.AuthBytesInvalidError = exports2.AudioTitleEmptyError = exports2.AudioContentUrlEmptyError = exports2.ArticleTitleEmptyError = exports2.ApiIdPublishedFloodError = exports2.ApiIdInvalidError = exports2.AlbumPhotosTooManyError = exports2.AicomposeToneTitleInvalidError = exports2.AicomposeToneInvalidError = exports2.AicomposeFloodPremiumError = exports2.AiComposeTaskMissingError = exports2.AdminsTooMuchError = exports2.AdminRightsEmptyError = exports2.AdminRankInvalidError = exports2.AdminRankEmojiNotAllowedError = exports2.AdminIdInvalidError = exports2.AddressInvalidError = exports2.AdExpiredError = exports2.AccessTokenInvalidError = exports2.AccessTokenExpiredError = exports2.AboutTooLongError = exports2.UserMigrateError = exports2.StatsMigrateError = exports2.PhoneMigrateError = exports2.NetworkMigrateError = undefined;
  exports2.ChannelTooLargeError = exports2.ChannelTooBigError = exports2.ChannelPrivateError = exports2.ChannelParicipantMissingError = exports2.ChannelMonoforumUnsupportedError = exports2.ChannelInvalidError = exports2.ChannelIdInvalidError = exports2.ChannelForumMissingError = exports2.CdnMethodInvalidError = exports2.CallProtocolLayerInvalidError = exports2.CallProtocolFlagsInvalidError = exports2.CallPeerInvalidError = exports2.CallOccupyFailedError = exports2.CallNotActiveError = exports2.CallAlreadyDeclinedError = exports2.CallAlreadyAcceptedError = exports2.ButtonUserPrivacyRestrictedError = exports2.ButtonUserInvalidError = exports2.ButtonUrlInvalidError = exports2.ButtonTypeInvalidError = exports2.ButtonTextInvalidError = exports2.ButtonPosInvalidError = exports2.ButtonInvalidError = exports2.ButtonIdInvalidError = exports2.ButtonDataInvalidError = exports2.ButtonCopyTextInvalidError = exports2.BusinessWorkHoursPeriodInvalidError = exports2.BusinessWorkHoursEmptyError = exports2.BusinessRecipientsEmptyError = exports2.BusinessPeerUsageMissingError = exports2.BusinessPeerInvalidError = exports2.BusinessConnectionNotAllowedError = exports2.BusinessConnectionInvalidError = exports2.BroadcastRequiredError = exports2.BroadcastPublicVotersForbiddenError = exports2.BroadcastIdInvalidError = exports2.BotsTooMuchError = exports2.BotWebviewDisabledError = exports2.BotScoreNotModifiedError = exports2.BotResponseTimeoutError = exports2.BotPaymentsDisabledError = exports2.BotOnesideNotAvailError = exports2.BotNotConnectedYetError = exports2.BotInvoiceInvalidError = exports2.BotInvalidError = exports2.BotInlineDisabledError = exports2.BotIdInvalidError = exports2.BotGroupsBlockedError = exports2.BotGamesDisabledError = exports2.BotFallbackUnsupportedError = undefined;
  exports2.CustomReactionsTooManyError = exports2.CurrencyTotalAmountInvalidError = exports2.CredentialInvalidError = exports2.CreateCallFailedError = exports2.ContactReqMissingError = exports2.ContactNameEmptyError = exports2.ContactMissingError = exports2.ContactIdInvalidError = exports2.ContactAddMissingError = exports2.ConnectionLayerInvalidError = exports2.ConnectionIdInvalidError = exports2.ConnectionAppVersionEmptyError = exports2.ConnectionApiIdInvalidError = exports2.ColorInvalidError = exports2.CollectionIdInvalidError = exports2.CollectibleNotFoundError = exports2.CollectibleInvalidError = exports2.CodeInvalidError = exports2.CodeHashInvalidError = exports2.CodeEmptyError = exports2.ChatlistsTooMuchError = exports2.ChatlistExcludeInvalidError = exports2.ChatlinksTooMuchError = exports2.ChatlinkSlugExpiredError = exports2.ChatlinkSlugEmptyError = exports2.ChatWriteForbiddenError = exports2.ChatTooBigError = exports2.ChatTitleEmptyError = exports2.ChatSendInlineForbiddenError = exports2.ChatRevokeDateUnsupportedError = exports2.ChatRestrictedError = exports2.ChatPublicRequiredError = exports2.ChatNotModifiedError = exports2.ChatMemberAddFailedError = exports2.ChatLinkExistsError = exports2.ChatInvitePermanentError = exports2.ChatInvalidError = exports2.ChatIdInvalidError = exports2.ChatIdEmptyError = exports2.ChatForwardsRestrictedError = exports2.ChatDiscussionUnallowedError = exports2.ChatAdminRequiredError = exports2.ChatAboutTooLongError = exports2.ChatAboutNotModifiedError = exports2.ChargeIdInvalidError = exports2.ChargeIdEmptyError = exports2.ChargeAlreadyRefundedError = exports2.ChannelsTooMuchError = exports2.ChannelsAdminPublicTooMuchError = exports2.ChannelsAdminLocatedTooMuchError = undefined;
  exports2.FilePartSizeChangedError = exports2.FilePartLengthInvalidError = exports2.FilePartInvalidError = exports2.FilePartEmptyError = exports2.FileIdInvalidError = exports2.FileEmtpyError = exports2.FileContentTypeInvalidError = exports2.ExternalUrlInvalidError = exports2.ExtendedMediaPeerInvalidError = exports2.ExtendedMediaInvalidError = exports2.ExtendedMediaEmptyError = exports2.ExtendedMediaAmountInvalidError = exports2.ExportCardInvalidError = exports2.ExpiresAtInvalidError = exports2.ExpireDateInvalidError = exports2.ErrorTextEmptyError = exports2.EntityMentionUserInvalidError = exports2.EntityDateTooLongError = exports2.EntityDateInvalidError = exports2.EntityDateFormatInvalidError = exports2.EntityBoundsInvalidError = exports2.EntitiesTooLongError = exports2.EncryptionIdInvalidError = exports2.EncryptionDeclinedError = exports2.EncryptionAlreadyDeclinedError = exports2.EncryptionAlreadyAcceptedError = exports2.EncryptedMessageInvalidError = exports2.EmoticonStickerpackMissingError = exports2.EmoticonInvalidError = exports2.EmoticonEmptyError = exports2.EmojiNotModifiedError = exports2.EmojiMarkupInvalidError = exports2.EmojiInvalidError = exports2.EmailVerifyExpiredError = exports2.EmailUnconfirmedError = exports2.EmailNotSetupError = exports2.EmailNotAllowedError = exports2.EmailInvalidError = exports2.EmailInstallMissingError = exports2.EmailHashExpiredError = exports2.EffectIdInvalidError = exports2.EffectChatInvalidError = exports2.DocumentInvalidError = exports2.DhGAInvalidError = exports2.DcIdInvalidError = exports2.DateEmptyError = exports2.DataTooLongError = exports2.DataJsonInvalidError = exports2.DataInvalidError = exports2.DataHashSizeInvalidError = undefined;
  exports2.IdInvalidError = exports2.IdExpiredError = exports2.HideRequesterMissingError = exports2.HashtagInvalidError = exports2.HashSizeInvalidError = exports2.HashInvalidError = exports2.GroupedMediaInvalidError = exports2.GroupcallSsrcDuplicateMuchError = exports2.GroupcallNotModifiedError = exports2.GroupcallJoinMissingError = exports2.GroupcallInvalidError = exports2.GroupcallForbiddenError = exports2.GroupcallAlreadyDiscardedError = exports2.GraphOutdatedReloadError = exports2.GraphInvalidReloadError = exports2.GraphExpiredReloadError = exports2.GiftStarsInvalidError = exports2.GiftSlugInvalidError = exports2.GiftSlugExpiredError = exports2.GiftMonthsInvalidError = exports2.GifIdInvalidError = exports2.GifContentTypeInvalidError = exports2.GeoPointInvalidError = exports2.GeneralModifyIconForbiddenError = exports2.GameBotInvalidError = exports2.FrozenParticipantMissingError = exports2.FromPeerInvalidError = exports2.FromMessageBotDisabledError = exports2.FreshChangeAdminsForbiddenError = exports2.ForumEnabledError = exports2.FormUnsupportedError = exports2.FormSubmitDuplicateError = exports2.FormIdEmptyError = exports2.FormExpiredError = exports2.FolderIdInvalidError = exports2.FolderIdEmptyError = exports2.FirstnameInvalidError = exports2.FilterTitleEmptyError = exports2.FilterNotSupportedError = exports2.FilterIncludeEmptyError = exports2.FilterIdInvalidError = exports2.FileTokenInvalidError = exports2.FileTitleEmptyError = exports2.FileReferenceInvalidError = exports2.FileReferenceExpiredError = exports2.FileReferenceEmptyError = exports2.FilePartsInvalidError = exports2.FilePartTooSmallError = exports2.FilePartTooBigError = exports2.FilePartSizeInvalidError = undefined;
  exports2.MediaGroupedInvalidError = exports2.MediaFileInvalidError = exports2.MediaEmptyError = exports2.MediaCaptionTooLongError = exports2.MediaAlreadyPaidError = exports2.Md5ChecksumInvalidError = exports2.MaxQtsInvalidError = exports2.MaxIdInvalidError = exports2.MaxDateInvalidError = exports2.ManagerPermissionMissingError = exports2.ManagerInvalidError = exports2.LocationInvalidError = exports2.LinkNotModifiedError = exports2.LimitPerPostInvalidError = exports2.LimitInvalidError = exports2.LastnameInvalidError = exports2.LanguageInvalidError = exports2.LangPackInvalidError = exports2.LangCodeNotSupportedError = exports2.LangCodeInvalidError = exports2.JoinAsPeerInvalidError = exports2.InvoicePayloadInvalidError = exports2.InvoiceInvalidError = exports2.InvitesTooMuchError = exports2.InviteSlugInvalidError = exports2.InviteSlugExpiredError = exports2.InviteSlugEmptyError = exports2.InviteRevokedMissingError = exports2.InviteRequestSentError = exports2.InviteHashInvalidError = exports2.InviteHashExpiredError = exports2.InviteHashEmptyError = exports2.InviteForbiddenWithJoinasError = exports2.InputUserDeactivatedError = exports2.InputTextTooLongError = exports2.InputTextEmptyError = exports2.InputStarsNanosInvalidError = exports2.InputStarsAmountInvalidError = exports2.InputPurposeInvalidError = exports2.InputPeersEmptyError = exports2.InputFilterInvalidError = exports2.InputFileInvalidError = exports2.InputChatlistInvalidError = exports2.InlineResultExpiredError = exports2.ImportTokenInvalidError = exports2.ImportIdInvalidError = exports2.ImportFormatUnrecognizedError = exports2.ImportFormatDateInvalidError = exports2.ImportFileInvalidError = exports2.ImageProcessFailedError = undefined;
  exports2.ParticipantIdInvalidError = exports2.ParentPeerInvalidError = exports2.PackTypeInvalidError = exports2.PackTitleInvalidError = exports2.PackShortNameOccupiedError = exports2.PackShortNameInvalidError = exports2.OrderInvalidError = exports2.OptionsTooMuchError = exports2.OptionInvalidError = exports2.OffsetPeerIdInvalidError = exports2.OffsetInvalidError = exports2.NotJoinedError = exports2.NotEligibleError = exports2.NogeneralHideForbiddenError = exports2.NoPaymentNeededError = exports2.NextOffsetInvalidError = exports2.NewSettingsInvalidError = exports2.NewSettingsEmptyError = exports2.NewSaltInvalidError = exports2.NeedActionMissingError = exports2.NameInvalidError = exports2.MultiMediaTooLongError = exports2.MsgWaitError = exports2.MsgVoiceTooLongError = exports2.MsgVoiceMissingError = exports2.MsgTooOldError = exports2.MsgIdInvalidError = exports2.MonthInvalidError = exports2.MinDateInvalidError = exports2.MethodInvalidError = exports2.MessageTooOldError = exports2.MessageTooLongError = exports2.MessageRequiredError = exports2.MessagePollClosedError = exports2.MessageNotReadYetError = exports2.MessageNotModifiedError = exports2.MessageIdsEmptyError = exports2.MessageIdInvalidError = exports2.MessageEmptyError = exports2.MessageEditTimeExpiredError = exports2.MegagroupRequiredError = exports2.MegagroupPrehistoryHiddenError = exports2.MegagroupIdInvalidError = exports2.MegagroupGeoRequiredError = exports2.MediaVideoStoryMissingError = exports2.MediaTypeInvalidError = exports2.MediaTtlInvalidError = exports2.MediaPrevInvalidError = exports2.MediaNewInvalidError = exports2.MediaInvalidError = undefined;
  exports2.PollAnswerInvalidError = exports2.PinnedTopicNotModifiedError = exports2.PinnedTooMuchError = exports2.PinnedDialogsTooMuchError = exports2.PinRestrictedError = exports2.PhotoThumbUrlEmptyError = exports2.PhotoSaveFileInvalidError = exports2.PhotoInvalidDimensionsError = exports2.PhotoInvalidError = exports2.PhotoIdInvalidError = exports2.PhotoFileMissingError = exports2.PhotoExtInvalidError = exports2.PhotoCropSizeSmallError = exports2.PhotoCropFileMissingError = exports2.PhotoContentUrlEmptyError = exports2.PhotoContentTypeInvalidError = exports2.PhonePasswordProtectedError = exports2.PhoneNumberUnoccupiedError = exports2.PhoneNumberOccupiedError = exports2.PhoneNumberInvalidError = exports2.PhoneNumberFloodError = exports2.PhoneNumberBannedError = exports2.PhoneNumberAppSignupForbiddenError = exports2.PhoneNotOccupiedError = exports2.PhoneHashExpiredError = exports2.PhoneCodeInvalidError = exports2.PhoneCodeHashEmptyError = exports2.PhoneCodeExpiredError = exports2.PhoneCodeEmptyError = exports2.PersistentTimestampInvalidError = exports2.PersistentTimestampEmptyError = exports2.PeersListEmptyError = exports2.PeerTypesInvalidError = exports2.PeerIdNotSupportedError = exports2.PeerIdInvalidError = exports2.PeerHistoryEmptyError = exports2.PaymentRequiredError = exports2.PaymentProviderInvalidError = exports2.PaymentCredentialsInvalidError = exports2.PasswordTooFreshError = exports2.PasswordRequiredError = exports2.PasswordRecoveryNaError = exports2.PasswordRecoveryExpiredError = exports2.PasswordMissingError = exports2.PasswordHashInvalidError = exports2.PasswordEmptyError = exports2.PasskeyOriginMismatchError = exports2.ParticipantsTooFewError = exports2.ParticipantVersionOutdatedError = exports2.ParticipantJoinMissingError = undefined;
  exports2.ResellStarsTooMuchError = exports2.ResellStarsTooFewError = exports2.RequestTokenInvalidError = exports2.RequestMsgExpiredError = exports2.ReplyToUserInvalidError = exports2.ReplyToMonoforumPeerInvalidError = exports2.ReplyToInvalidError = exports2.ReplyMessagesTooMuchError = exports2.ReplyMessageIdInvalidError = exports2.ReplyMarkupTooLongError = exports2.ReplyMarkupInvalidError = exports2.ReplyMarkupGameEmptyError = exports2.ReplyMarkupBuyEmptyError = exports2.ReceiptEmptyError = exports2.ReactionsTooManyError = exports2.ReactionsCountInvalidError = exports2.ReactionInvalidError = exports2.ReactionEmptyError = exports2.RangesInvalidError = exports2.RandomLengthInvalidError = exports2.RandomIdInvalidError = exports2.RandomIdExpiredError = exports2.RandomIdEmptyError = exports2.RandomIdDuplicateError = exports2.RaiseHandForbiddenError = exports2.QuoteTextInvalidError = exports2.QuizMultipleInvalidError = exports2.QuizCorrectAnswersTooMuchError = exports2.QuizCorrectAnswersEmptyError = exports2.QuizCorrectAnswerInvalidError = exports2.QuizAnswerMissingError = exports2.QuickRepliesTooMuchError = exports2.QuickRepliesBotNotAllowedError = exports2.QueryTooShortError = exports2.QueryIdInvalidError = exports2.QueryIdEmptyError = exports2.PurposeInvalidError = exports2.PublicKeyRequiredError = exports2.PublicKeyInvalidError = exports2.PublicBroadcastExpectedError = exports2.PrivacyValueInvalidError = exports2.PrivacyTooLongError = exports2.PrivacyKeyInvalidError = exports2.PricingChatInvalidError = exports2.PremiumPurposeInvalidError = exports2.PremiumAccountRequiredError = exports2.PollQuestionInvalidError = exports2.PollOptionInvalidError = exports2.PollOptionDuplicateError = exports2.PollAnswersInvalidError = undefined;
  exports2.StargiftNotUniqueError = exports2.StargiftNotOwnerError = exports2.StargiftNotFoundError = exports2.StargiftMessageInvalidError = exports2.StargiftInvalidError = exports2.StargiftAttributeInvalidError = exports2.StargiftAlreadyUpgradedError = exports2.StargiftAlreadyRefundedError = exports2.StargiftAlreadyConvertedError = exports2.SrpPasswordChangedError = exports2.SrpIdInvalidError = exports2.SrpAInvalidError = exports2.SmsjobIdInvalidError = exports2.SmsCodeCreateFailedError = exports2.SlugInvalidError = exports2.SlowmodeMultiMsgsDisabledError = exports2.SlotsEmptyError = exports2.ShortcutInvalidError = exports2.ShortNameOccupiedError = exports2.ShortNameInvalidError = exports2.Sha256HashInvalidError = exports2.SettingsInvalidError = exports2.SessionTooFreshError = exports2.SendMessageTypeInvalidError = exports2.SendMessageMediaInvalidError = exports2.SendMessageGameInvalidError = exports2.SendAsPeerInvalidError = exports2.SelfDeleteRestrictedError = exports2.SecureSecretRequiredError = exports2.SecondsInvalidError = exports2.SearchWithLinkNotSupportedError = exports2.SearchQueryEmptyError = exports2.ScoreInvalidError = exports2.ScheduleTooMuchError = exports2.ScheduleStatusPrivateError = exports2.ScheduleDateTooLateError = exports2.ScheduleDateInvalidError = exports2.ScheduleBotNotAllowedError = exports2.SavedIdEmptyError = exports2.RsaDecryptFailedError = exports2.RingtoneMimeInvalidError = exports2.RingtoneInvalidError = exports2.RightsNotModifiedError = exports2.RevoteNotAllowedError = exports2.ResultsTooMuchError = exports2.ResultTypeInvalidError = exports2.ResultIdInvalidError = exports2.ResultIdEmptyError = exports2.ResultIdDuplicateError = exports2.ResetRequestMissingError = undefined;
  exports2.StoryPeriodInvalidError = exports2.StoryNotModifiedError = exports2.StoryLiveAlreadyError = exports2.StoryIdInvalidError = exports2.StoryIdEmptyError = exports2.StoriesTooMuchError = exports2.StoriesNeverCreatedError = exports2.StickersetInvalidError = exports2.StickersTooMuchError = exports2.StickersEmptyError = exports2.StickerpackStickersTooMuchError = exports2.StickerVideoNowebmError = exports2.StickerVideoNodocError = exports2.StickerVideoBigError = exports2.StickerThumbTgsNotgsError = exports2.StickerThumbPngNopngError = exports2.StickerTgsNotgsError = exports2.StickerTgsNodocError = exports2.StickerPngNopngError = exports2.StickerPngDimensionsError = exports2.StickerMimeInvalidError = exports2.StickerInvalidError = exports2.StickerIdInvalidError = exports2.StickerGifDimensionsError = exports2.StickerFileInvalidError = exports2.StickerEmojiInvalidError = exports2.StickerDocumentInvalidError = exports2.StartParamTooLongError = exports2.StartParamInvalidError = exports2.StartParamEmptyError = exports2.StarsPaymentRequiredError = exports2.StarsInvoiceInvalidError = exports2.StarsAmountInvalidError = exports2.StarrefPermilleTooLowError = exports2.StarrefPermilleInvalidError = exports2.StarrefHashRevokedError = exports2.StarrefExpiredError = exports2.StarrefAwaitingEndError = exports2.StargiftUserUsageLimitedError = exports2.StargiftUsageLimitedError = exports2.StargiftUpgradeUnavailableError = exports2.StargiftTransferTooEarlyError = exports2.StargiftSlugInvalidError = exports2.StargiftResellTooEarlyError = exports2.StargiftResellCurrencyNotAllowedError = exports2.StargiftPeerInvalidError = exports2.StargiftOwnerInvalidError = exports2.StargiftOfferNotAllowedError = exports2.StargiftOfferInvalidError = exports2.StargiftObjectInvalidError = undefined;
  exports2.TtlPeriodInvalidError = exports2.TtlMediaInvalidError = exports2.TtlDaysInvalidError = exports2.TranslateReqQuotaExceededError = exports2.TranscriptionFailedError = exports2.TransactionIdInvalidError = exports2.TopicsEmptyError = exports2.TopicTitleEmptyError = exports2.TopicNotModifiedError = exports2.TopicIdInvalidError = exports2.TopicHideSeparatelyError = exports2.TopicDeletedError = exports2.TopicClosedError = exports2.TopicCloseSeparatelyError = exports2.TokenTypeInvalidError = exports2.TokenInvalidError = exports2.TokenEmptyError = exports2.TodoNotModifiedError = exports2.TodoItemsTooMuchError = exports2.TodoItemsEmptyError = exports2.TodoItemDuplicateError = exports2.ToLangInvalidError = exports2.ToIdInvalidError = exports2.TmpPasswordInvalidError = exports2.TmpPasswordDisabledError = exports2.TitleInvalidError = exports2.TimezoneInvalidError = exports2.ThemeTitleInvalidError = exports2.ThemeSlugInvalidError = exports2.ThemeParamsInvalidError = exports2.ThemeMimeInvalidError = exports2.ThemeInvalidError = exports2.ThemeFormatInvalidError = exports2.ThemeFileInvalidError = exports2.TextdraftPeerInvalidError = exports2.TermsUrlInvalidError = exports2.TempAuthKeyEmptyError = exports2.TempAuthKeyAlreadyBoundError = exports2.TaskAlreadyExistsError = exports2.TakeoutRequiredError = exports2.TakeoutInvalidError = exports2.SwitchWebviewUrlInvalidError = exports2.SwitchPmTextEmptyError = exports2.SuggestedPostPeerInvalidError = exports2.SuggestedPostAmountInvalidError = exports2.SubscriptionPeriodInvalidError = exports2.SubscriptionIdInvalidError = exports2.SubscriptionExportMissingError = exports2.StorySendFloodWeeklyError = exports2.StorySendFloodMonthlyError = undefined;
  exports2.WcConvertUrlInvalidError = exports2.WallpaperNotFoundError = exports2.WallpaperMimeInvalidError = exports2.WallpaperInvalidError = exports2.WallpaperFileInvalidError = exports2.VoiceMessagesForbiddenError = exports2.VideoTitleEmptyError = exports2.VideoStopForbiddenError = exports2.VideoPauseForbiddenError = exports2.VideoFileInvalidError = exports2.VideoDurationInvalidError = exports2.VideoContentTypeInvalidError = exports2.VenueIdInvalidError = exports2.UsersTooMuchError = exports2.UsersTooFewError = exports2.UserpicUploadRequiredError = exports2.UsernamesActiveTooMuchError = exports2.UsernameSuffixMissingError = exports2.UsernamePurchaseAvailableError = exports2.UsernameOccupiedError = exports2.UsernameNotOccupiedError = exports2.UsernameNotModifiedError = exports2.UsernameInvalidError = exports2.UserVolumeInvalidError = exports2.UserPublicMissingError = exports2.UserNotParticipantError = exports2.UserNotMutualContactError = exports2.UserKickedError = exports2.UserIsBotError = exports2.UserIsBlockedError = exports2.UserInvalidError = exports2.UserIdInvalidError = exports2.UserGiftUnavailableError = exports2.UserCreatorError = exports2.UserChannelsTooMuchError = exports2.UserBotToBotDisabledError = exports2.UserBotRequiredError = exports2.UserBotInvalidError = exports2.UserBotError = exports2.UserBlockedError = exports2.UserBannedInChannelError = exports2.UserAlreadyParticipantError = exports2.UserAlreadyInvitedError = exports2.UserAdminInvalidError = exports2.UsageLimitInvalidError = exports2.UrlInvalidError = exports2.UrlExpiredError = exports2.UntilDateInvalidError = exports2.UnsupportedError = exports2.TypesEmptyError = undefined;
  exports2.ChatGuestSendForbiddenError = exports2.ChatAdminInviteRequiredError = exports2.ChatActionForbiddenError = exports2.ChannelPublicGroupNaError = exports2.BroadcastForbiddenError = exports2.BotVerifierForbiddenError = exports2.BotGuardNotSupportedError = exports2.BotForumCreateForbiddenError = exports2.BotAccessForbiddenError = exports2.AllowPaymentRequiredError = exports2.AccessDeniedError = exports2.UserDeactivatedBanError = exports2.UserDeactivatedError = exports2.SessionRevokedError = exports2.SessionPasswordNeededError = exports2.SessionExpiredError = exports2.AuthKeyPermEmptyError = exports2.AuthKeyInvalidError = exports2.AuthKeyUnregisteredError = exports2.StickersetNotModifiedError = exports2.PeerFloodError = exports2.InputRequestTooLongError = exports2.InputMethodInvalidError = exports2.InputLayerInvalidError = exports2.InputFetchFailError = exports2.InputFetchErrorError = exports2.InputConstructorInvalidError = exports2.FilePartMissingError = exports2.FileMigrateError = exports2.ConnectionSystemLangCodeEmptyError = exports2.ConnectionSystemEmptyError = exports2.ConnectionNotInitedError = exports2.ConnectionLangPackInvalidError = exports2.ConnectionDeviceModelEmptyError = exports2.BotMethodInvalidError = exports2.YouBlockedUserError = exports2.WebpushTokenInvalidError = exports2.WebpushKeyInvalidError = exports2.WebpushAuthInvalidError = exports2.WebpageUrlInvalidError = exports2.WebpageNotFoundError = exports2.WebpageMediaEmptyError = exports2.WebpageCurlFailedError = exports2.WebdocumentUrlInvalidError = exports2.WebdocumentUrlEmptyError = exports2.WebdocumentSizeTooBigError = exports2.WebdocumentMimeInvalidError = exports2.WebdocumentInvalidError = exports2.WebauthTokenExpiredError = exports2.WebappReqIdInvalidError = undefined;
  exports2.StickersetOwnerAnonymousError = exports2.StarsFormAmountMismatchError = exports2.StargiftExportInProgressError = exports2.SendCodeUnavailableError = exports2.PreviousChatImportActiveWaitMinError = exports2.PremiumCurrentlyUnavailableError = exports2.PrecheckoutFailedError = exports2.PollMemberRestrictedError = exports2.PollCountryRestrictedError = exports2.PhonePasswordFloodError = exports2.PaymentUnsupportedError = exports2.FreshResetAuthorisationForbiddenError = exports2.FreshChangePhoneForbiddenError = exports2.FilerefUpgradeNeededError = exports2.EditMessageTempRestrictedError = exports2.CallProtocolCompatLayerInvalidError = exports2.BusinessAddressActiveError = exports2.ApiGiftRestrictedUpdateAppError = exports2.ChatForbiddenError = exports2.YourPrivacyRestrictedError = exports2.UserRestrictedError = exports2.UserPrivacyRestrictedError = exports2.UserPermissionDeniedError = exports2.UserDisallowedStargiftsError = exports2.UserDeletedError = exports2.SensitiveChangeForbiddenError = exports2.RightForbiddenError = exports2.PublicChannelMissingError = exports2.PrivacyPremiumRequiredError = exports2.PollVoteRequiredError = exports2.MessageDeleteForbiddenError = exports2.MessageAuthorRequiredError = exports2.InlineBotRequiredError = exports2.GroupcallChangeForbiddenError = exports2.GroupcallAlreadyStartedError = exports2.EditBotInviteForbiddenError = exports2.ChatTypeInvalidError = exports2.ChatSendWebpageForbiddenError = exports2.ChatSendVoicesForbiddenError = exports2.ChatSendVideosForbiddenError = exports2.ChatSendStickersForbiddenError = exports2.ChatSendRoundvideosForbiddenError = exports2.ChatSendPollForbiddenError = exports2.ChatSendPlainForbiddenError = exports2.ChatSendPhotosForbiddenError = exports2.ChatSendMediaForbiddenError = exports2.ChatSendGifsForbiddenError = exports2.ChatSendGameForbiddenError = exports2.ChatSendDocsForbiddenError = exports2.ChatSendAudiosForbiddenError = undefined;
  exports2.baseErrors = exports2.rpcErrorRe = exports2.rpcErrorsRe = exports2.rpcErrorsDict = exports2.FloodTestPhoneWaitError = exports2.AnonymousReactionsDisabledError = exports2.MsgWaitTimeoutError = exports2.TimeoutError = exports2.TranslationTimeoutError = exports2.TranslateReqFailedError = exports2.SignInFailedError = exports2.SendMediaInvalidError = exports2.PersistentTimestampOutdatedError = exports2.OauthRequestInvalidError = exports2.ChatIdGenerateFailedError = exports2.CdnUploadTimeoutError = exports2.AuthRestartError = exports2.AuthKeyUnsynchronizedError = exports2.AicomposeTimeoutError = exports2.TakeoutInitDelayError = exports2.SlowModeWaitError = exports2.PremiumSubActiveUntilError = exports2.FrozenMethodInvalidError = exports2.FloodWaitError = exports2.TwoFaConfirmWaitError = exports2.AuthKeyDuplicatedError = exports2.UserpicPrivacyRequiredError = exports2.UpdateAppToLoginError = exports2.TranslationsDisabledError = undefined;
  var RPCBaseErrors_1 = require_RPCBaseErrors();

  class NetworkMigrateError extends RPCBaseErrors_1.InvalidDCError {
    constructor(args) {
      const newDc = Number(args.capture || 0);
      const message = "Your IP address is associated to DC " + newDc + ", please re-send the query to that DC." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.newDc = newDc;
    }
  }
  exports2.NetworkMigrateError = NetworkMigrateError;

  class PhoneMigrateError extends RPCBaseErrors_1.InvalidDCError {
    constructor(args) {
      const newDc = Number(args.capture || 0);
      const message = "Your phone number is associated to DC " + newDc + ", please re-send the query to that DC." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.newDc = newDc;
    }
  }
  exports2.PhoneMigrateError = PhoneMigrateError;

  class StatsMigrateError extends RPCBaseErrors_1.InvalidDCError {
    constructor(args) {
      const newDc = Number(args.capture || 0);
      const message = "Channel statistics for the specified channel are stored on DC " + newDc + ", please re-send the query to that DC." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.newDc = newDc;
    }
  }
  exports2.StatsMigrateError = StatsMigrateError;

  class UserMigrateError extends RPCBaseErrors_1.InvalidDCError {
    constructor(args) {
      const newDc = Number(args.capture || 0);
      const message = "Your account is associated to DC " + newDc + ", please re-send the query to that DC." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.newDc = newDc;
    }
  }
  exports2.UserMigrateError = UserMigrateError;

  class AboutTooLongError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "About string too long." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "ABOUT_TOO_LONG";
    }
  }
  exports2.AboutTooLongError = AboutTooLongError;

  class AccessTokenExpiredError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "Access token expired." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "ACCESS_TOKEN_EXPIRED";
    }
  }
  exports2.AccessTokenExpiredError = AccessTokenExpiredError;

  class AccessTokenInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "Access token invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "ACCESS_TOKEN_INVALID";
    }
  }
  exports2.AccessTokenInvalidError = AccessTokenInvalidError;

  class AdExpiredError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The ad has expired (too old or not found)." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "AD_EXPIRED";
    }
  }
  exports2.AdExpiredError = AdExpiredError;

  class AddressInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified geopoint address is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "ADDRESS_INVALID";
    }
  }
  exports2.AddressInvalidError = AddressInvalidError;

  class AdminIdInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified admin ID is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "ADMIN_ID_INVALID";
    }
  }
  exports2.AdminIdInvalidError = AdminIdInvalidError;

  class AdminRankEmojiNotAllowedError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "An admin rank cannot contain emojis." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "ADMIN_RANK_EMOJI_NOT_ALLOWED";
    }
  }
  exports2.AdminRankEmojiNotAllowedError = AdminRankEmojiNotAllowedError;

  class AdminRankInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified admin rank is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "ADMIN_RANK_INVALID";
    }
  }
  exports2.AdminRankInvalidError = AdminRankInvalidError;

  class AdminRightsEmptyError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The chatAdminRights constructor passed in keyboardButtonRequestPeer.peer_type.user_admin_rights has no rights set (i.e. flags is 0)." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "ADMIN_RIGHTS_EMPTY";
    }
  }
  exports2.AdminRightsEmptyError = AdminRightsEmptyError;

  class AdminsTooMuchError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "There are too many admins." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "ADMINS_TOO_MUCH";
    }
  }
  exports2.AdminsTooMuchError = AdminsTooMuchError;

  class AiComposeTaskMissingError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "No AI task was specified. The caller must provide at least one of: proofread, translate (with a target language), tone, or emojify." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "AI_COMPOSE_TASK_MISSING";
    }
  }
  exports2.AiComposeTaskMissingError = AiComposeTaskMissingError;

  class AicomposeFloodPremiumError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "You've reached the daily limit of AI text transformations, upgrade to [Telegram Premium](https://core.telegram.org/api/premium) to get **50x** times more AI text transformations per day!" + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "AICOMPOSE_FLOOD_PREMIUM";
    }
  }
  exports2.AicomposeFloodPremiumError = AicomposeFloodPremiumError;

  class AicomposeToneInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified tone is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "AICOMPOSE_TONE_INVALID";
    }
  }
  exports2.AicomposeToneInvalidError = AicomposeToneInvalidError;

  class AicomposeToneTitleInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified tone title is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "AICOMPOSE_TONE_TITLE_INVALID";
    }
  }
  exports2.AicomposeToneTitleInvalidError = AicomposeToneTitleInvalidError;

  class AlbumPhotosTooManyError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "You have uploaded too many profile photos, delete some before retrying." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "ALBUM_PHOTOS_TOO_MANY";
    }
  }
  exports2.AlbumPhotosTooManyError = AlbumPhotosTooManyError;

  class ApiIdInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "API ID invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "API_ID_INVALID";
    }
  }
  exports2.ApiIdInvalidError = ApiIdInvalidError;

  class ApiIdPublishedFloodError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "This API id was published somewhere, you can't use it now." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "API_ID_PUBLISHED_FLOOD";
    }
  }
  exports2.ApiIdPublishedFloodError = ApiIdPublishedFloodError;

  class ArticleTitleEmptyError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The title of the article is empty." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "ARTICLE_TITLE_EMPTY";
    }
  }
  exports2.ArticleTitleEmptyError = ArticleTitleEmptyError;

  class AudioContentUrlEmptyError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The remote URL specified in the content field is empty." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "AUDIO_CONTENT_URL_EMPTY";
    }
  }
  exports2.AudioContentUrlEmptyError = AudioContentUrlEmptyError;

  class AudioTitleEmptyError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "An empty audio title was provided." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "AUDIO_TITLE_EMPTY";
    }
  }
  exports2.AudioTitleEmptyError = AudioTitleEmptyError;

  class AuthBytesInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The provided authorization is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "AUTH_BYTES_INVALID";
    }
  }
  exports2.AuthBytesInvalidError = AuthBytesInvalidError;

  class AuthTokenAlreadyAcceptedError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified auth token was already accepted." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "AUTH_TOKEN_ALREADY_ACCEPTED";
    }
  }
  exports2.AuthTokenAlreadyAcceptedError = AuthTokenAlreadyAcceptedError;

  class AuthTokenExceptionError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "An error occurred while importing the auth token." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "AUTH_TOKEN_EXCEPTION";
    }
  }
  exports2.AuthTokenExceptionError = AuthTokenExceptionError;

  class AuthTokenExpiredError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The authorization token has expired." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "AUTH_TOKEN_EXPIRED";
    }
  }
  exports2.AuthTokenExpiredError = AuthTokenExpiredError;

  class AuthTokenInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified auth token is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "AUTH_TOKEN_INVALID";
    }
  }
  exports2.AuthTokenInvalidError = AuthTokenInvalidError;

  class AuthTokenInvalidxError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified auth token is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "AUTH_TOKEN_INVALIDX";
    }
  }
  exports2.AuthTokenInvalidxError = AuthTokenInvalidxError;

  class AutoarchiveNotAvailableError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The autoarchive setting is not available at this time: please check the value of the [autoarchive_setting_available field in client config &raquo;](https://core.telegram.org/api/config#client-configuration) before calling this method." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "AUTOARCHIVE_NOT_AVAILABLE";
    }
  }
  exports2.AutoarchiveNotAvailableError = AutoarchiveNotAvailableError;

  class BalanceTooLowError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The transaction cannot be completed because the current [Telegram Stars balance](https://core.telegram.org/api/stars) is too low." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "BALANCE_TOO_LOW";
    }
  }
  exports2.BalanceTooLowError = BalanceTooLowError;

  class BankCardNumberInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified card number is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "BANK_CARD_NUMBER_INVALID";
    }
  }
  exports2.BankCardNumberInvalidError = BankCardNumberInvalidError;

  class BannedRightsInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "You provided some invalid flags in the banned rights." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "BANNED_RIGHTS_INVALID";
    }
  }
  exports2.BannedRightsInvalidError = BannedRightsInvalidError;

  class BirthdayAlreadyError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The target user already has a birthday set." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "BIRTHDAY_ALREADY";
    }
  }
  exports2.BirthdayAlreadyError = BirthdayAlreadyError;

  class BirthdayInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "An invalid age was specified, must be between 0 and 150 years." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "BIRTHDAY_INVALID";
    }
  }
  exports2.BirthdayInvalidError = BirthdayInvalidError;

  class BoostNotModifiedError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "You're already [boosting](https://core.telegram.org/api/boost) the specified channel." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "BOOST_NOT_MODIFIED";
    }
  }
  exports2.BoostNotModifiedError = BoostNotModifiedError;

  class BoostPeerInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified `boost_peer` is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "BOOST_PEER_INVALID";
    }
  }
  exports2.BoostPeerInvalidError = BoostPeerInvalidError;

  class BoostsEmptyError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "No boost slots were specified." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "BOOSTS_EMPTY";
    }
  }
  exports2.BoostsEmptyError = BoostsEmptyError;

  class BoostsRequiredError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified channel must first be [boosted by its users](https://core.telegram.org/api/boost) in order to perform this action." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "BOOSTS_REQUIRED";
    }
  }
  exports2.BoostsRequiredError = BoostsRequiredError;

  class BotAlreadyDisabledError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The connected business bot was already disabled for the specified peer." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "BOT_ALREADY_DISABLED";
    }
  }
  exports2.BotAlreadyDisabledError = BotAlreadyDisabledError;

  class BotAppBotInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The bot_id passed in the inputBotAppShortName constructor is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "BOT_APP_BOT_INVALID";
    }
  }
  exports2.BotAppBotInvalidError = BotAppBotInvalidError;

  class BotAppInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified bot app is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "BOT_APP_INVALID";
    }
  }
  exports2.BotAppInvalidError = BotAppInvalidError;

  class BotAppShortnameInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified bot app short name is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "BOT_APP_SHORTNAME_INVALID";
    }
  }
  exports2.BotAppShortnameInvalidError = BotAppShortnameInvalidError;

  class BotBusinessMissingError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified bot is not a business bot (the [user](https://core.telegram.org/constructor/user).`bot_business` flag is not set)." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "BOT_BUSINESS_MISSING";
    }
  }
  exports2.BotBusinessMissingError = BotBusinessMissingError;

  class BotChannelsNaError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "Bots can't edit admin privileges." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "BOT_CHANNELS_NA";
    }
  }
  exports2.BotChannelsNaError = BotChannelsNaError;

  class BotCommandDescriptionInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified command description is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "BOT_COMMAND_DESCRIPTION_INVALID";
    }
  }
  exports2.BotCommandDescriptionInvalidError = BotCommandDescriptionInvalidError;

  class BotCommandInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified command is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "BOT_COMMAND_INVALID";
    }
  }
  exports2.BotCommandInvalidError = BotCommandInvalidError;

  class BotCreateLimitExceededError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The current user already owns the maximum allowed number of owned bots, as specified by [`bots_create_limit_default` &raquo;](https://core.telegram.org/api/config#bots-create-limit-default) and [`bots_create_limit_premium` &raquo;](https://core.telegram.org/api/config#bots-create-limit-premium); if the current user doesn't have Telegram Premium, upgrading to Premium will allow them to create more bots." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "BOT_CREATE_LIMIT_EXCEEDED";
    }
  }
  exports2.BotCreateLimitExceededError = BotCreateLimitExceededError;

  class BotDomainInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "Bot domain invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "BOT_DOMAIN_INVALID";
    }
  }
  exports2.BotDomainInvalidError = BotDomainInvalidError;

  class BotFallbackUnsupportedError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The fallback flag can't be set for bots." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "BOT_FALLBACK_UNSUPPORTED";
    }
  }
  exports2.BotFallbackUnsupportedError = BotFallbackUnsupportedError;

  class BotGamesDisabledError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "Games can't be sent to channels." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "BOT_GAMES_DISABLED";
    }
  }
  exports2.BotGamesDisabledError = BotGamesDisabledError;

  class BotGroupsBlockedError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "This bot can't be added to groups." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "BOT_GROUPS_BLOCKED";
    }
  }
  exports2.BotGroupsBlockedError = BotGroupsBlockedError;

  class BotIdInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified bot ID is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "BOT_ID_INVALID";
    }
  }
  exports2.BotIdInvalidError = BotIdInvalidError;

  class BotInlineDisabledError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "This bot can't be used in inline mode." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "BOT_INLINE_DISABLED";
    }
  }
  exports2.BotInlineDisabledError = BotInlineDisabledError;

  class BotInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "This is not a valid bot." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "BOT_INVALID";
    }
  }
  exports2.BotInvalidError = BotInvalidError;

  class BotInvoiceInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified invoice is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "BOT_INVOICE_INVALID";
    }
  }
  exports2.BotInvoiceInvalidError = BotInvoiceInvalidError;

  class BotNotConnectedYetError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "No [business bot](https://core.telegram.org/api/business#connected-bots) is connected to the currently logged in user." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "BOT_NOT_CONNECTED_YET";
    }
  }
  exports2.BotNotConnectedYetError = BotNotConnectedYetError;

  class BotOnesideNotAvailError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "Bots can't pin messages in PM just for themselves." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "BOT_ONESIDE_NOT_AVAIL";
    }
  }
  exports2.BotOnesideNotAvailError = BotOnesideNotAvailError;

  class BotPaymentsDisabledError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "Please enable bot payments in botfather before calling this method." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "BOT_PAYMENTS_DISABLED";
    }
  }
  exports2.BotPaymentsDisabledError = BotPaymentsDisabledError;

  class BotResponseTimeoutError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "A timeout occurred while fetching data from the bot." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "BOT_RESPONSE_TIMEOUT";
    }
  }
  exports2.BotResponseTimeoutError = BotResponseTimeoutError;

  class BotScoreNotModifiedError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The score wasn't modified." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "BOT_SCORE_NOT_MODIFIED";
    }
  }
  exports2.BotScoreNotModifiedError = BotScoreNotModifiedError;

  class BotWebviewDisabledError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "A webview cannot be opened in the specified conditions: emitted for example if `from_bot_menu` or `url` are set and `peer` is not the chat with the bot." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "BOT_WEBVIEW_DISABLED";
    }
  }
  exports2.BotWebviewDisabledError = BotWebviewDisabledError;

  class BotsTooMuchError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "There are too many bots in this chat/channel." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "BOTS_TOO_MUCH";
    }
  }
  exports2.BotsTooMuchError = BotsTooMuchError;

  class BroadcastIdInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "Broadcast ID invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "BROADCAST_ID_INVALID";
    }
  }
  exports2.BroadcastIdInvalidError = BroadcastIdInvalidError;

  class BroadcastPublicVotersForbiddenError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "You can't forward polls with public voters." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "BROADCAST_PUBLIC_VOTERS_FORBIDDEN";
    }
  }
  exports2.BroadcastPublicVotersForbiddenError = BroadcastPublicVotersForbiddenError;

  class BroadcastRequiredError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "This method can only be called on a channel, please use stats.getMegagroupStats for supergroups." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "BROADCAST_REQUIRED";
    }
  }
  exports2.BroadcastRequiredError = BroadcastRequiredError;

  class BusinessConnectionInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The `connection_id` passed to the wrapping [invokeWithBusinessConnection](https://core.telegram.org/api/business) call is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "BUSINESS_CONNECTION_INVALID";
    }
  }
  exports2.BusinessConnectionInvalidError = BusinessConnectionInvalidError;

  class BusinessConnectionNotAllowedError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "This method was invoked over a business connection using [invokeWithBusinessConnection](https://core.telegram.org/api/business#connected-bots), but either (1) we're a user, and users cannot invoke methods over a business connection; (2) we're a bot, but business mode was disabled in @botfather or (3); we're a bot, but this method cannot be invoked over a business connection." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "BUSINESS_CONNECTION_NOT_ALLOWED";
    }
  }
  exports2.BusinessConnectionNotAllowedError = BusinessConnectionNotAllowedError;

  class BusinessPeerInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "Messages can't be set to the specified peer through the current [business connection](https://core.telegram.org/api/business#connected-bots)." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "BUSINESS_PEER_INVALID";
    }
  }
  exports2.BusinessPeerInvalidError = BusinessPeerInvalidError;

  class BusinessPeerUsageMissingError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "You cannot send a message to a user through a [business connection](https://core.telegram.org/api/business#connected-bots) if the user hasn't recently contacted us." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "BUSINESS_PEER_USAGE_MISSING";
    }
  }
  exports2.BusinessPeerUsageMissingError = BusinessPeerUsageMissingError;

  class BusinessRecipientsEmptyError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "You didn't set any flag in inputBusinessBotRecipients, thus the bot cannot work with *any* peer." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "BUSINESS_RECIPIENTS_EMPTY";
    }
  }
  exports2.BusinessRecipientsEmptyError = BusinessRecipientsEmptyError;

  class BusinessWorkHoursEmptyError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "No work hours were specified." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "BUSINESS_WORK_HOURS_EMPTY";
    }
  }
  exports2.BusinessWorkHoursEmptyError = BusinessWorkHoursEmptyError;

  class BusinessWorkHoursPeriodInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified work hours are invalid, see [here &raquo;](https://core.telegram.org/api/business#opening-hours) for the exact requirements." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "BUSINESS_WORK_HOURS_PERIOD_INVALID";
    }
  }
  exports2.BusinessWorkHoursPeriodInvalidError = BusinessWorkHoursPeriodInvalidError;

  class ButtonCopyTextInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified [keyboardButtonCopy](https://core.telegram.org/constructor/keyboardButtonCopy).`copy_text` is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "BUTTON_COPY_TEXT_INVALID";
    }
  }
  exports2.ButtonCopyTextInvalidError = ButtonCopyTextInvalidError;

  class ButtonDataInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The data of one or more of the buttons you provided is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "BUTTON_DATA_INVALID";
    }
  }
  exports2.ButtonDataInvalidError = ButtonDataInvalidError;

  class ButtonIdInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified button ID is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "BUTTON_ID_INVALID";
    }
  }
  exports2.ButtonIdInvalidError = ButtonIdInvalidError;

  class ButtonInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified button is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "BUTTON_INVALID";
    }
  }
  exports2.ButtonInvalidError = ButtonInvalidError;

  class ButtonPosInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The position of one of the keyboard buttons is invalid (i.e. a Game or Pay button not in the first position, and so on...)." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "BUTTON_POS_INVALID";
    }
  }
  exports2.ButtonPosInvalidError = ButtonPosInvalidError;

