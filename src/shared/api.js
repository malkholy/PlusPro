const IS_DEV = import.meta.env.DEV;
const API_URL = IS_DEV
  ? '/api/General/GeneralAPI/'
  : 'https://sila.silasystem.com:7103/General/GeneralAPI/';

const BASE_BODY = {
  AppVersionWeb: '225',
  AppVersionAndroid: '225',
  AppVersionIos: '225',
  AppVersionDesktop: '225',
  FireBaseToken: '',
  PlatForm: 'web',
  deviceID: '',
  IP: '192.168.1.3'
};

export async function apiCall(operation, lineData = null, extraParams = {}, apiType = 'default') {
  let target = 'default';
  if (apiType === true || apiType === 'express') {
    target = 'express';
  } else if (apiType === 'hr') {
    target = 'hr';
  } else if (apiType === 'recruitment_requests' || apiType === 'recruitment') {
    target = 'recruitment';
  } else if (apiType === 'plus') {
    target = 'plus';
  } else if (apiType === 'query') {
    // CreateQueryView/ExecuteScript were folded into APIPlusOperation -- route through 'plus'.
    target = 'plus';
  } else if (apiType === 'purchasing') {
    target = 'purchasing';
  } else if (apiType === 'logistics') {
    target = 'logistics';
  } else if (apiType === 'journal') {
    target = 'journal';
  } else if (apiType === 'lookup') {
    // Lookup operations were folded into APIPlusOperation -- route through 'plus'.
    target = 'plus';
  } else if (apiType === 'express_codes') {
    target = 'express_codes';
  } else if (apiType === 'inv') {
    target = 'inv';
  } else if (apiType === 'loading') {
    target = 'loading';
  } else if (apiType === 'warehouse_request') {
    target = 'warehouse_request';
  } else if (apiType === 'rma') {
    target = 'rma';
  } else if (apiType === 'customer_order') {
    target = 'customer_order';
  } else if (apiType === 'customer_order_price') {
    target = 'customer_order_price';
  } else if (apiType === 'acp') {
    target = 'acp';
  }

  let url = '';
  let spName = '';

  const isGitHubPages = window.location.hostname === 'malkholy.github.io';

  if (target === 'express') {
    url = IS_DEV ? '/express-api/General/GeneralAPI/' : 'https://quick.glcpaints.com:7790/General/GeneralAPI/';
    spName = 'APIExprssControlOperation';
  } else if (target === 'recruitment') {
    url = IS_DEV ? '/hr-api/General/GeneralAPI/' : 'https://quick.glcpaints.com:7001/General/GeneralAPI/';
    spName = '[PLS].[APIPlusRecruitmentOperation]';
  } else if (target === 'hr') {
    url = IS_DEV ? '/hr-api/General/GeneralAPI/' : 'https://quick.glcpaints.com:7001/General/GeneralAPI/';
    spName = 'APIHRControlOperation';
  } else if (target === 'plus') {
    url = IS_DEV ? '/plus-api/General/GeneralAPI/' : 'https://sila.silasystem.com:7103/General/GeneralAPI/';
    spName = 'APIPlusOperation';
  } else if (target === 'purchasing') {
    url = (IS_DEV || isGitHubPages) 
      ? (IS_DEV ? '/purchasing-api/General/GeneralAPI/' : 'https://sila.silasystem.com:7103/General/GeneralAPI/') 
      : '/plus-api/General/GeneralAPI/';
    spName = (IS_DEV || isGitHubPages) ? 'APIPlusPurchasingOperation' : 'APIPlusOperation';
  } else if (target === 'logistics') {
    url = IS_DEV ? '/logistics-api/General/GeneralAPI/' : 'https://sila.silasystem.com:7103/General/GeneralAPI/';
    spName = 'APIPlusLogisticsOperation';
  } else if (target === 'journal') {
    url = IS_DEV ? '/journal-api/General/GeneralAPI/' : 'https://sila.silasystem.com:7103/General/GeneralAPI/';
    spName = 'APIPlusJournalOperation';
  } else if (target === 'express_codes') {
    url = IS_DEV ? '/express-codes-api/Express/GeneralAPI' : 'https://be.glcpaints.com:7788/Express/GeneralAPI';
    spName = 'APIPlusExpressGenerateCodeOperation';
  } else if (target === 'inv') {
    url = IS_DEV ? '/inv-api/General/GeneralAPI/' : 'https://sila.silasystem.com:7103/General/GeneralAPI/';
    spName = 'PLS.APIPlusInvOperation';
  } else if (target === 'loading') {
    url = IS_DEV ? '/loading-api/General/GeneralAPI/' : 'https://sila.silasystem.com:7103/General/GeneralAPI/';
    spName = 'APIPlusLoadingOperation';
  } else if (target === 'warehouse_request') {
    url = IS_DEV ? '/warehouse-request-api/General/GeneralAPI/' : 'https://sila.silasystem.com:7103/General/GeneralAPI/';
    spName = 'APIPlusWarehouseRequestOperation';
  } else if (target === 'rma') {
    url = IS_DEV ? '/rma-api/General/GeneralAPI/' : 'https://sila.silasystem.com:7103/General/GeneralAPI/';
    spName = 'APIPlusRMAOperation';
  } else if (target === 'customer_order') {
    url = IS_DEV ? '/customer-order-api/General/GeneralAPI/' : 'https://sila.silasystem.com:7103/General/GeneralAPI/';
    spName = 'APIPlusCustomerOrderOperation';
  } else if (target === 'customer_order_price') {
    url = IS_DEV ? '/customer-order-price-api/General/GeneralAPI/' : 'https://sila.silasystem.com:7103/General/GeneralAPI/';
    spName = 'COR.APIPlusCustomerOrderPricePromotionOperation';
  } else if (target === 'acp') {
    url = IS_DEV ? '/acp-api/General/GeneralAPI/' : 'https://sila.silasystem.com:7103/General/GeneralAPI/';
    spName = 'APIPlusACPOperation';
  } else {
    url = IS_DEV ? '/api/General/GeneralAPI/' : 'https://sila.silasystem.com:7103/General/GeneralAPI/';
    spName = 'APIPlusOperation';
  }

  let method = 'POST';
  let headers = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'SP_Name': spName
  };
  let body = JSON.stringify({
    ...BASE_BODY,
    Operation: operation,
    LineData: lineData ? JSON.stringify(lineData) : null,
    User: sessionStorage.getItem('Username') || sessionStorage.getItem('FullName') || '',
    ...extraParams
  });

  if (target === 'express_codes') {
    method = 'POST';
    headers = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'SP_Name': spName,
      'Authorization': 'Bearer YMQs3vAyVUmtiZi-89cRxro4ZPloFJD8zdbnG5b0XpZtvhdT4yuH47HmOoPAWl8kZHl9mgGYG_vUFlTWIiJLZNRZqHgAAkmHuN7XPnqIGVSvlE7gsXuxwW5OMzDMC5Ffm3E-l5Phi9ZSZlwmzs2es6piK0Q-hjt1L7hvLyEgru-h97pLL8rCvmOpvjIYm0SRU-cOJkPCuKvpClR5uCyrOw'
    };
    body = JSON.stringify({
      Operation: operation,
      LineData: lineData ? JSON.stringify(lineData) : '',
      User: sessionStorage.getItem('Username') || sessionStorage.getItem('FullName') || 'System',
      AppVersionWeb: 225,
      AppVersionAndroid: 225,
      AppVersionIos: 225,
      AppVersionDesktop: 225,
      PlatForm: 'web',
      FireBaseToken: ''
    });
  }

  const res = await fetch(url, {
    method,
    headers,
    body
  });
  const text = await res.text();
  console.log(operation, 'raw:', text);
  if (!text) throw new Error('Empty response from server');
  return JSON.parse(text);
}

async function sha1(string) {
  const utf8 = new TextEncoder().encode(string);
  const hashBuffer = await window.crypto.subtle.digest('SHA-1', utf8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

export async function uploadToCloudinary(file) {
  const cloudName = 'peeuy5s9';
  const apiKey = '419134873188179';
  const apiSecret = 'NoxrhWPv3O0_kWuWIMPtuxuD16k';
  const folder = 'Plus';
  const timestamp = Math.round(new Date().getTime() / 1000);

  const paramsToSign = `folder=${folder}&timestamp=${timestamp}`;
  const signature = await sha1(paramsToSign + apiSecret);

  const formData = new FormData();
  formData.append('file', file);
  formData.append('folder', folder);
  formData.append('timestamp', timestamp);
  formData.append('api_key', apiKey);
  formData.append('signature', signature);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
    method: 'POST',
    body: formData
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error('Cloudinary upload failed: ' + errText);
  }

  const json = await res.json();
  return json.secure_url;
}



