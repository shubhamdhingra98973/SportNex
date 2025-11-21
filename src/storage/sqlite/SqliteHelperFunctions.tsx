export function serializeForDB(data: any, jsonFields: string[]): any {
    const prepared = {...data};
  
    jsonFields.forEach(field => {
      if (field in prepared) {
        prepared[field] =
          prepared[field] != null ? JSON.stringify(prepared[field]) : null;
      }
    });
  
    return prepared;
  }
  
  export function deserializeFromDB(row: any, jsonFields: string[]): any {
    const parsed = {...row};
  
    jsonFields.forEach(field => {
      if (parsed[field]) {
        try {
          parsed[field] = JSON.parse(parsed[field]);
        } catch (e) {
          parsed[field] = null;
        }
      }
    });
  
    return parsed;
  }


export function nullable<T>(value: T | undefined | null): T | null {
    return value ?? null;
  }


  // Function to encode all string values within an object, including nested objects and arrays.
// Encoding is especially useful when user input may include special characters like Chinese or Hindi text.
export const encodeData = (obj: any): any => {
    const encodedObj: any = {};
    for (const key in obj) {
      if (!obj.hasOwnProperty(key)) continue;
  
      const val = obj[key];
      if (typeof val === 'string') {
        try {
          // Avoid double encoding
          encodedObj[key] = encodeURIComponent(decodeURIComponent(val));
        } catch {
          encodedObj[key] = encodeURIComponent(val);
        }
      } else if (typeof val === 'object' && val !== null) {
        encodedObj[key] = Array.isArray(val)
          ? val.map(v => (typeof v === 'object' ? encodeData(v) : v))
          : encodeData(val);
      } else {
        encodedObj[key] = val;
      }
    }
    return encodedObj;
  };
  
  // Function to decode all encoded string values within an object, including nested objects and arrays.
  // Decoding converts encoded special characters (like Chinese or Hindi) back to their original form.
  export const decodeData = (obj: any): any => {
    const decodedObj: any = {};
    for (const key in obj) {
      if (!obj.hasOwnProperty(key)) continue;
  
      const val = obj[key];
      if (typeof val === 'string') {
        try {
          decodedObj[key] = decodeURIComponent(val);
        } catch {
          decodedObj[key] = val;
        }
      } else if (typeof val === 'object' && val !== null) {
        decodedObj[key] = Array.isArray(val)
          ? val.map(v => (typeof v === 'object' ? decodeData(v) : v))
          : decodeData(val);
      } else {
        decodedObj[key] = val;
      }
    }
    return decodedObj;
  };