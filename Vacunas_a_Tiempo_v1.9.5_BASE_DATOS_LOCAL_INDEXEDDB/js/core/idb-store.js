/* Vacunas a Tiempo v1.9.5 - Capa local IndexedDB
   Mantiene compatibilidad con localStorage y prepara sincronización futura. */
(function(){
  'use strict';
  const DB_NAME='vacunas_a_tiempo_local';
  const DB_VERSION=1;
  const STORE='records';
  const MAIN_KEY='vat_v1_data';
  let dbPromise=null;

  function uuid(){
    if(globalThis.crypto && typeof globalThis.crypto.randomUUID==='function') return globalThis.crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{const r=Math.random()*16|0,v=c==='x'?r:(r&3|8);return v.toString(16)});
  }
  function open(){
    if(!('indexedDB' in globalThis)) return Promise.reject(new Error('IndexedDB no disponible'));
    if(dbPromise) return dbPromise;
    dbPromise=new Promise((resolve,reject)=>{
      const req=indexedDB.open(DB_NAME,DB_VERSION);
      req.onupgradeneeded=()=>{
        const db=req.result;
        if(!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE,{keyPath:'key'});
      };
      req.onsuccess=()=>resolve(req.result);
      req.onerror=()=>reject(req.error||new Error('No fue posible abrir IndexedDB'));
    });
    return dbPromise;
  }
  async function get(key){
    const db=await open();
    return new Promise((resolve,reject)=>{
      const req=db.transaction(STORE,'readonly').objectStore(STORE).get(key);
      req.onsuccess=()=>resolve(req.result?.value??null);
      req.onerror=()=>reject(req.error);
    });
  }
  async function put(key,value,meta={}){
    const db=await open();
    const now=new Date().toISOString();
    const previous=await get(key).catch(()=>null);
    const record={key,value,meta:{id:previous?.meta?.id||uuid(),createdAt:previous?.meta?.createdAt||now,updatedAt:now,version:Number(previous?.meta?.version||0)+1,syncStatus:'pending',...meta}};
    return new Promise((resolve,reject)=>{
      const req=db.transaction(STORE,'readwrite').objectStore(STORE).put(record);
      req.onsuccess=()=>resolve(record);
      req.onerror=()=>reject(req.error);
    });
  }
  async function remove(key){
    const db=await open();
    return new Promise((resolve,reject)=>{
      const req=db.transaction(STORE,'readwrite').objectStore(STORE).delete(key);
      req.onsuccess=()=>resolve(true);
      req.onerror=()=>reject(req.error);
    });
  }
  async function mirrorMain(value){ return put(MAIN_KEY,value,{entity:'applicationData'}); }
  async function restoreMain(){ return get(MAIN_KEY); }
  async function status(){
    try{const record=await get(MAIN_KEY);return {available:true,hasBackup:!!record,meta:record?.meta||null}}catch(error){return {available:false,hasBackup:false,error:String(error)}}
  }
  window.VATStorage={open,get,put,remove,mirrorMain,restoreMain,status,uuid,DB_NAME,STORE};
})();
