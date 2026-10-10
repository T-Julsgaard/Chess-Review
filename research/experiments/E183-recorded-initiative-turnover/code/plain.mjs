// Exact-value caches accept only ordinary data; getters/custom serialization
// cannot turn altered proof values into a previously admitted representation.
export function plain(value,seen=new Set()){
  if(value===null||value===undefined||['string','boolean','number'].includes(typeof value))return;
  if(typeof value!=='object'||seen.has(value))throw Error('Expected acyclic plain proof data');
  const proto=Object.getPrototypeOf(value);
  if(proto!==Object.prototype&&proto!==null&&proto!==Array.prototype)throw Error('Expected plain proof data');
  seen.add(value);
  for(const key of Reflect.ownKeys(value)){
    if(Array.isArray(value)&&key==='length')continue;
    const d=Object.getOwnPropertyDescriptor(value,key);
    if(typeof key!=='string'||!d.enumerable||!Object.hasOwn(d,'value'))throw Error('Expected ordinary proof fields');
    plain(d.value,seen);
  }
  seen.delete(value);
}
