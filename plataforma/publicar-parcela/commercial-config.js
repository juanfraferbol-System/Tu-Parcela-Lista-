export const COMMERCIAL_FALLBACK_CONFIG=Object.freeze({partnerServicePercent:.02,extraParcelPrice:5990,source:'frontend-fallback-v1'});

export function partnerPricing(ownerAmount,config=COMMERCIAL_FALLBACK_CONFIG){
 const owner=Math.max(0,Number(ownerAmount)||0),percent=Math.max(0,Number(config.partnerServicePercent)||0),service=Math.round(owner*percent);
 return {ownerAmount:owner,servicePercent:percent,serviceAmount:service,publicPrice:owner+service,source:config.source};
}
