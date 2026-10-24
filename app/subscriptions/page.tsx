'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Clock3, CreditCard, Loader2, Pause, Play, RefreshCw, XCircle } from 'lucide-react';
import PageHeader from '@/components/admin/layout/PageHeader';
import getBrowserSupabase from '@/lib/supabase/client';

type Restaurant = { id:string; name:string; approval_status:string; is_accepting_orders:boolean; latitude:number|null; longitude:number|null };
type SavedAddress = { id:string; label:string|null; address:string; lat:number|null; lng:number|null };
type MenuOption = { id:string; name:string; price:number; is_available?:boolean; stock_quantity?:number|null; stock_reserved?:number };
type MenuOptionGroup = { id:string; name:string; required:boolean; selection_type:'single'|'multiple'; min_select?:number; max_select?:number; options:MenuOption[] };
type MenuItem = { id:string; restaurant_id:string; name:string; price:number; promotional_price:number|null; promotion_starts_at:string|null; promotion_ends_at:string|null; is_available:boolean; admin_disabled:boolean; category:string|null; image_url:string|null; description:string|null; ingredients:string|null; serving_size:string|null; preparation_time_minutes:number|null; allergens:string[]; dietary_tags:string[]; option_groups:MenuOptionGroup[] };
type Subscription = { id:string; restaurant_id:string; package_weeks:number; delivery_days:number[]; delivery_time:string; selected_items:{menu_item_id:string;name:string;quantity:number;unit_price:number}[]; total_deliveries:number; total_amount:number; status:string; starts_on:string|null; ends_on:string|null; paid_at:string|null; created_at:string; restaurant?:{name:string}|null };
const DAY_OPTIONS=[{value:1,label:'Mon'},{value:2,label:'Tue'},{value:3,label:'Wed'},{value:4,label:'Thu'},{value:5,label:'Fri'},{value:6,label:'Sat'},{value:7,label:'Sun'}];
const money=(n:number)=>new Intl.NumberFormat('en-NG',{style:'currency',currency:'NGN',maximumFractionDigits:0}).format(n);

export default function SubscriptionsPage(){
  const [supabase]=useState(()=>getBrowserSupabase());
  const [userId,setUserId]=useState<string|null>(null);
  const [restaurants,setRestaurants]=useState<Restaurant[]>([]);
  const [restaurantId,setRestaurantId]=useState('');
  const [menu,setMenu]=useState<MenuItem[]>([]);
  const [addresses,setAddresses]=useState<SavedAddress[]>([]);
  const [addressId,setAddressId]=useState('');
  const [platformFee,setPlatformFee]=useState(505);
  const [deliveryRate,setDeliveryRate]=useState(150);
  const [minimumDeliveryFee,setMinimumDeliveryFee]=useState(1000);
  const [quantities,setQuantities]=useState<Record<string,number>>({});
  const [optionQuantities,setOptionQuantities]=useState<Record<string,Record<string,number>>>({});
  const [expandedItem,setExpandedItem]=useState<string|null>(null);
  const [weeks,setWeeks]=useState(4);
  const [days,setDays]=useState<number[]>([1,2,3,4,5]);
  const [mealTime,setMealTime]=useState('lunch');
  const [subscriptions,setSubscriptions]=useState<Subscription[]>([]);
  const [loading,setLoading]=useState(true);
  const [menuLoading,setMenuLoading]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState<string|null>(null);
  const [notice,setNotice]=useState<string|null>(null);

  const loadSubscriptions=useCallback(async()=>{
    const {data,error}=await supabase.from('meal_subscriptions').select('id,restaurant_id,package_weeks,delivery_days,delivery_time,selected_items,total_deliveries,total_amount,status,starts_on,ends_on,paid_at,created_at,restaurants(name)').order('created_at',{ascending:false}).limit(100);
    if(!error)setSubscriptions((data??[]).map((row:any)=>({...row,restaurant:row.restaurants})) as Subscription[]);
  },[supabase]);

  useEffect(()=>{
    let active=true;
    void (async()=>{
      const {data:{user}}=await supabase.auth.getUser();
      if(!active)return;
      setUserId(user?.id??null);
      if(!user){setLoading(false);return;}
      const [{data,error},{data:addressData},{data:pricingData}]=await Promise.all([supabase.from('restaurants').select('id,name,approval_status,is_accepting_orders,latitude,longitude').eq('approval_status','approved').eq('is_accepting_orders',true).order('name'),supabase.from('saved_addresses').select('id,label,address,lat,lng').eq('customer_id',user.id).order('created_at',{ascending:false}),supabase.from('pricing_config').select('key,value').in('key',['platform_fee','delivery_rate_per_km','minimum_delivery_fee'])]);
      if(active){setAddresses((addressData??[]) as SavedAddress[]);const price=(key:string,fallback:number)=>{const value=Number(pricingData?.find((row:any)=>row.key===key)?.value);return Number.isFinite(value)&&value>=0?value:fallback;};setPlatformFee(price('platform_fee',505));setDeliveryRate(price('delivery_rate_per_km',150));setMinimumDeliveryFee(price('minimum_delivery_fee',1000));}
      if(!active)return;
      if(error)setError('Could not load kitchens. Please refresh and try again.');
      else setRestaurants((data??[]) as Restaurant[]);
      await loadSubscriptions();
      if(active)setLoading(false);
    })();
    return()=>{active=false;};
  },[supabase,loadSubscriptions]);

  useEffect(()=>{
    if(!restaurantId){setMenu([]);setQuantities({});return;}
    let active=true;setMenuLoading(true);
    void supabase.from('menu_items').select('id,restaurant_id,name,price,promotional_price,promotion_starts_at,promotion_ends_at,is_available,admin_disabled,category,image_url,description,ingredients,serving_size,preparation_time_minutes,allergens,dietary_tags,option_groups').eq('restaurant_id',restaurantId).eq('is_available',true).order('category').order('name')
      .then(({data,error})=>{if(!active)return;if(error)setError('Could not load this kitchen menu.');else setMenu(((data??[]) as MenuItem[]).filter(item=>!item.admin_disabled));setQuantities({});setOptionQuantities({});setExpandedItem(null);setMenuLoading(false);});
    return()=>{active=false;};
  },[restaurantId,supabase]);

  useEffect(()=>{
    const params=new URLSearchParams(window.location.search);const reference=params.get('reference');
    if(!reference||!userId)return;
    let active=true;
    void (async()=>{
      setBusy(true);setError(null);
      const {data,error}=await supabase.functions.invoke('meal-subscription-payment',{body:{action:'verify',reference}});
      if(!active)return;
      if(error||!data?.success)setError(data?.error??error?.message??'We could not confirm payment yet. Refresh to try again.');
      else {setNotice('Payment confirmed. Your prepaid meal package is active.');await loadSubscriptions();window.history.replaceState({},'',window.location.pathname);}
      setBusy(false);
    })();
    return()=>{active=false;};
  },[userId,supabase,loadSubscriptions]);

  const selected=useMemo(()=>menu.filter(item=>(quantities[item.id]??0)>0),[menu,quantities]);
  const itemBasePrice=(item:MenuItem)=>{const now=Date.now();const start=item.promotion_starts_at?new Date(item.promotion_starts_at).getTime():-Infinity;const end=item.promotion_ends_at?new Date(item.promotion_ends_at).getTime():Infinity;return item.promotional_price!=null&&now>=start&&now<=end?Number(item.promotional_price):Number(item.price);};
  const selectedOptionsFor=(item:MenuItem)=>item.option_groups.flatMap(group=>group.options.filter(option=>(optionQuantities[item.id]?.[option.id]??0)>0).map(option=>({groupId:group.id,groupName:group.name,optionId:option.id,optionName:option.name,price:Number(option.price),quantity:optionQuantities[item.id]?.[option.id]??0})));
  const itemOptionsValid=(item:MenuItem)=>item.option_groups.every(group=>{const chosen=group.options.filter(option=>(optionQuantities[item.id]?.[option.id]??0)>0);const min=group.required?Math.max(1,group.min_select??1):(group.min_select??0);const max=group.selection_type==='single'?1:(group.max_select??group.options.length);return chosen.length>=min&&chosen.length<=max&&chosen.every(option=>option.is_available!==false&&(option.stock_quantity==null||Number(option.stock_quantity)-Number(option.stock_reserved??0)>=(optionQuantities[item.id]?.[option.id]??0)));};
  const updateOption=(item:MenuItem,group:MenuOptionGroup,option:MenuOption,next:number)=>setOptionQuantities(prev=>{const itemOptions={...(prev[item.id]??{})};if(next>0&&group.selection_type==='single')group.options.forEach(candidate=>{itemOptions[candidate.id]=0;});itemOptions[option.id]=Math.max(0,Math.min(99,next));return {...prev,[item.id]:itemOptions};});
  const selectedRestaurant=restaurants.find(item=>item.id===restaurantId);
  const selectedAddress=addresses.find(item=>item.id===addressId);
  const deliveryDistance=useMemo(()=>{if(!selectedRestaurant||selectedRestaurant.latitude==null||selectedRestaurant.longitude==null||selectedAddress?.lat==null||selectedAddress?.lng==null)return null;const rad=(v:number)=>v*Math.PI/180;const dLat=rad(Number(selectedAddress.lat)-Number(selectedRestaurant.latitude));const dLng=rad(Number(selectedAddress.lng)-Number(selectedRestaurant.longitude));const a=Math.sin(dLat/2)**2+Math.cos(rad(Number(selectedRestaurant.latitude)))*Math.cos(rad(Number(selectedAddress.lat)))*Math.sin(dLng/2)**2;return 6371*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));},[selectedRestaurant,selectedAddress]);
  const deliveryFee=deliveryDistance==null?minimumDeliveryFee:Math.max(Math.round(deliveryDistance*deliveryRate),minimumDeliveryFee);
  const perDelivery=useMemo(()=>selected.reduce((sum,item)=>{const optionCost=selectedOptionsFor(item).reduce((total,option)=>total+option.price*option.quantity,0);return sum+(itemBasePrice(item)+optionCost)*(quantities[item.id]??0);},0),[selected,quantities,optionQuantities]);
  const perDeliveryWithFees=perDelivery+platformFee+deliveryFee;
  const estimatedDeliveries=weeks*days.length;
  const estimate=perDeliveryWithFees*estimatedDeliveries;

  async function buyPackage(){
    if(!userId){setError('Please sign in before subscribing to a meal package.');return;}
    if(!restaurantId||!selected.length||!days.length||!addressId){setError('Choose a kitchen, delivery address, at least one meal item and one delivery day.');return;}
    if(selected.some(item=>!itemOptionsValid(item))){setError('Please complete the required variants or options for every selected meal.');return;}
    setBusy(true);setError(null);setNotice(null);
    const {data,error}=await supabase.functions.invoke('meal-subscription-payment',{body:{
      action:'initialize',restaurant_id:restaurantId,saved_address_id:addressId,package_weeks:weeks,delivery_days:days,delivery_time:mealTime,
      items:selected.map(item=>({menu_item_id:item.id,quantity:quantities[item.id],selected_options:selectedOptionsFor(item)})),callback_origin:window.location.origin
    }});
    if(error||!data?.authorization_url){setError(data?.error??error?.message??'Could not start payment.');setBusy(false);return;}
    window.location.href=data.authorization_url;
  }
  async function manage(subscriptionId:string,status:'active'|'paused'|'cancelled'){
    setBusy(true);setError(null);setNotice(null);
    const {data,error}=await supabase.functions.invoke('meal-subscription-payment',{body:{action:'manage',subscription_id:subscriptionId,status}});
    if(error||!data?.success)setError(data?.error??error?.message??'Could not update this subscription.');
    else {setNotice('Subscription updated: '+status+'.');await loadSubscriptions();}
    setBusy(false);
  }

  if(loading)return <main className="mx-auto max-w-5xl p-6"><p className="py-16 text-center text-sm text-gray-500"><Loader2 className="mr-2 inline h-4 w-4 animate-spin"/>Loading subscriptions…</p></main>;
  if(!userId)return <main className="mx-auto max-w-3xl p-6"><PageHeader title="Meal subscriptions" subtitle="Choose a kitchen, build your meal package and prepay for the full schedule."/><div className="rounded-2xl border bg-white p-6"><p className="text-sm text-gray-600">Please sign in to create or manage meal subscriptions.</p><a href="/login?next=%2Fsubscriptions" className="mt-4 inline-flex rounded-xl bg-orange-500 px-4 py-3 text-sm font-bold text-white">Sign in</a></div></main>;

  return <main className="mx-auto max-w-6xl p-4 sm:p-6">
    <PageHeader title="Meal subscriptions" subtitle="Build a scheduled meal package from one kitchen. Pay once upfront for all scheduled deliveries."/>
    {error&&<p role="alert" className="mb-4 rounded-xl p-4 text-sm" style={{background:'#FCE8E6',color:'#B42318'}}>{error}</p>}
    {notice&&<p role="status" className="mb-4 rounded-xl p-4 text-sm" style={{background:'#E7F6EC',color:'#207245'}}><CheckCircle2 className="mr-2 inline h-4 w-4"/>{notice}</p>}
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(300px,.8fr)]">
      <section className="space-y-5 rounded-2xl border bg-white p-4 sm:p-6" style={{borderColor:'var(--line)'}}>
        <div><h2 className="text-lg font-bold">1. Choose a kitchen</h2><select value={restaurantId} onChange={e=>setRestaurantId(e.target.value)} className="mt-3 w-full rounded-xl border px-3 py-3 text-sm" style={{borderColor:'var(--line)',background:'white'}}><option value="">Select a kitchen</option>{restaurants.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select>{restaurants.length===0&&<p className="mt-2 text-xs text-gray-500">No approved kitchens are currently accepting orders.</p>}</div>
        <div><h2 className="text-lg font-bold">2. Delivery address</h2><select value={addressId} onChange={e=>setAddressId(e.target.value)} className="mt-3 w-full rounded-xl border px-3 py-3 text-sm" style={{borderColor:'var(--line)',background:'white'}}><option value="">Choose saved delivery address</option>{addresses.map(address=><option key={address.id} value={address.id}>{address.label?address.label+' — ':''}{address.address}</option>)}</select>{addresses.length===0&&<p className="mt-2 text-xs text-gray-500">You need a saved address with a map location before subscribing. <a href="/order" className="font-semibold underline" style={{color:'var(--orange)'}}>Open checkout to add an address</a>.</p>}{selectedAddress&&deliveryDistance!=null&&<p className="mt-2 text-xs text-gray-500">Estimated kitchen distance: {deliveryDistance.toFixed(1)} km. Final eligibility is checked before payment.</p>}</div>
        <div><h2 className="text-lg font-bold">3. Select meals</h2><p className="mt-1 text-sm text-gray-500">The same selected items are included in each scheduled delivery.</p>
          {menuLoading?<p className="py-6 text-sm text-gray-500">Loading menu…</p>:!restaurantId?<p className="py-5 text-sm text-gray-500">Choose a kitchen to see its menu.</p>:menu.length===0?<p className="py-5 text-sm text-gray-500">No available menu items found for this kitchen.</p>:<div className="mt-3 divide-y" style={{borderColor:'var(--line)'}}>{menu.map(item=><div key={item.id} className="py-3"><div className="flex items-center justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-semibold">{item.name}</p><p className="mt-1 text-xs text-gray-500">{item.category??'Menu item'} · {money(Number(item.price))}</p></div><div className="flex shrink-0 items-center gap-3"><button type="button" aria-label={'Decrease '+item.name} onClick={()=>setQuantities(q=>({...q,[item.id]:Math.max(0,(q[item.id]??0)-1)}))} className="h-9 w-9 rounded-full border text-lg" style={{borderColor:'var(--line)'}} disabled={!quantities[item.id]}>−</button><span className="w-4 text-center text-sm font-semibold">{quantities[item.id]??0}</span><button type="button" aria-label={'Increase '+item.name} onClick={()=>setQuantities(q=>({...q,[item.id]:Math.min(20,(q[item.id]??0)+1)}))} className="h-9 w-9 rounded-full border text-lg" style={{borderColor:'var(--line)'}} disabled={(quantities[item.id]??0)>=20}>+</button></div><button type="button" onClick={()=>setExpandedItem(current=>current===item.id?null:item.id)} className="mt-2 text-xs font-semibold underline" style={{color:'var(--orange)'}} aria-expanded={expandedItem===item.id}>{expandedItem===item.id?'Hide item details':'View item details & variants'}</button>{expandedItem===item.id&&<div className="mt-3 rounded-xl p-3" style={{background:'#FFF7ED'}}>{item.description&&<p className="text-sm">{item.description}</p>}{item.ingredients&&<p className="mt-2 text-xs"><strong>Ingredients:</strong> {item.ingredients}</p>}{item.serving_size&&<p className="mt-2 text-xs"><strong>Serving:</strong> {item.serving_size}</p>}{item.preparation_time_minutes&&<p className="mt-2 text-xs"><strong>Preparation:</strong> about {item.preparation_time_minutes} min</p>}{(item.dietary_tags??[]).length>0&&<p className="mt-2 text-xs"><strong>Dietary:</strong> {item.dietary_tags.join(', ')}</p>}{(item.allergens??[]).length>0&&<p className="mt-2 text-xs text-amber-800"><strong>Allergens:</strong> {item.allergens.join(', ')}</p>}{item.option_groups.length===0?<p className="mt-2 text-xs text-gray-500">No variants/options are configured for this meal.</p>:item.option_groups.map(group=>{const chosen=group.options.filter(option=>(optionQuantities[item.id]?.[option.id]??0)>0).length;return <div key={group.id} className="mt-4"><p className="text-sm font-bold">{group.name} <span className="text-xs font-normal text-gray-600">{group.required?'· Required':'· Optional'} · {group.selection_type==='single'?'Choose one':'Choose up to '+(group.max_select??group.options.length)}</span></p><div className="mt-2 space-y-2">{group.options.map(option=>{const q=optionQuantities[item.id]?.[option.id]??0;const unavailable=option.is_available===false||(option.stock_quantity!=null&&Number(option.stock_quantity)-Number(option.stock_reserved??0)<=0);const limit=group.selection_type==='multiple'&&q===0&&chosen>=(group.max_select??group.options.length);return <div key={option.id} className="flex items-center justify-between gap-3 rounded-lg bg-white p-2"><div><p className="text-xs font-semibold">{option.name}</p><p className="text-xs" style={{color:'var(--orange)'}}>{option.price>0?'+₦'+Number(option.price).toLocaleString():'Included'}</p>{unavailable&&<p className="text-[10px] text-red-600">Unavailable</p>}</div><div className="flex items-center gap-2"><button type="button" disabled={!q} onClick={()=>updateOption(item,group,option,q-1)} className="h-8 w-8 rounded-full border disabled:opacity-30" style={{borderColor:'var(--line)'}}>−</button><span className="w-3 text-center text-xs">{q}</span><button type="button" disabled={unavailable||limit||(group.selection_type==='single'&&q>0)} onClick={()=>updateOption(item,group,option,q+1)} className="h-8 w-8 rounded-full text-white disabled:opacity-30" style={{background:'var(--orange)'}}>+</button></div></div>})}</div></div>})}{(quantities[item.id]??0)>0&&!itemOptionsValid(item)&&<p className="mt-3 text-xs font-semibold text-red-600">Select the required variant/options before payment.</p>}</div>}</div></div>)}</div>}
        </div>
        <div><h2 className="text-lg font-bold">4. Set your schedule</h2><label className="mt-3 block text-sm font-medium">Package duration<select value={weeks} onChange={e=>setWeeks(Number(e.target.value))} className="mt-1.5 w-full rounded-xl border px-3 py-3 text-sm" style={{borderColor:'var(--line)',background:'white'}}>{[1,2,3,4,6,8,12].map(w=><option key={w} value={w}>{w} {w===1?'week':'weeks'}</option>)}</select></label>
          <p className="mb-2 mt-4 text-sm font-medium">Delivery days</p><div className="grid grid-cols-4 gap-2 sm:grid-cols-7">{DAY_OPTIONS.map(day=><button type="button" key={day.value} onClick={()=>setDays(prev=>prev.includes(day.value)?prev.filter(d=>d!==day.value):[...prev,day.value].sort((a,b)=>a-b))} className="rounded-xl border px-2 py-3 text-sm font-semibold" style={{borderColor:days.includes(day.value)?'var(--orange)':'var(--line)',background:days.includes(day.value)?'#FFF0E5':'white',color:days.includes(day.value)?'var(--orange)':'var(--ink)'}} aria-pressed={days.includes(day.value)}>{day.label}</button>)}</div>
          <label className="mt-4 block text-sm font-medium">Preferred meal time<select value={mealTime} onChange={e=>setMealTime(e.target.value)} className="mt-1.5 w-full rounded-xl border px-3 py-3 text-sm" style={{borderColor:'var(--line)',background:'white'}}><option value="breakfast">Breakfast</option><option value="lunch">Lunch</option><option value="dinner">Dinner</option></select></label>
        </div>
      </section>
      <aside className="h-fit rounded-2xl border bg-white p-5 sm:p-6" style={{borderColor:'var(--line)'}}>
        <h2 className="text-lg font-bold">Prepaid package summary</h2><p className="mt-1 text-sm text-gray-500">No recurring charge. Pay the full package price now.</p>
        <div className="mt-5 space-y-3 text-sm"><div className="flex justify-between gap-3"><span className="text-gray-500">Meals per delivery</span><strong>{selected.reduce((n,item)=>n+(quantities[item.id]??0),0)}</strong></div><div className="flex justify-between gap-3"><span className="text-gray-500">Scheduled deliveries</span><strong>{estimatedDeliveries}</strong></div><div className="flex justify-between gap-3"><span className="text-gray-500">Meals per delivery</span><strong>{money(perDelivery)}</strong></div><div className="flex justify-between gap-3"><span className="text-gray-500">Platform fee per delivery</span><strong>{money(platformFee)}</strong></div><div className="flex justify-between gap-3"><span className="text-gray-500">Delivery fee per delivery (estimate)</span><strong>{money(deliveryFee)}</strong></div><div className="flex justify-between gap-3"><span className="text-gray-500">Total per delivery (estimate)</span><strong>{money(perDeliveryWithFees)}</strong></div><div className="border-t pt-4" style={{borderColor:'var(--line)'}}><div className="flex items-center justify-between gap-3"><span className="font-semibold">Pay upfront (estimate)</span><strong className="text-xl" style={{color:'var(--orange)'}}>{money(estimate)}</strong></div><p className="mt-2 text-xs text-gray-500">Final price is calculated securely from current menu prices before payment.</p></div></div>
        <button type="button" onClick={()=>void buyPackage()} disabled={busy||!restaurantId||!addressId||!selected.length||!days.length||estimate<=0} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-sm font-bold text-white disabled:opacity-50" style={{background:'var(--orange)'}}>{busy?<Loader2 className="h-4 w-4 animate-spin"/>:<CreditCard className="h-4 w-4"/>}{busy?'Processing…':'Pay and activate package'}</button>
      </aside>
    </div>
    <section className="mt-8 rounded-2xl border bg-white p-4 sm:p-6" style={{borderColor:'var(--line)'}}>
      <div className="mb-4 flex items-center justify-between gap-3"><div><h2 className="text-lg font-bold">Your meal packages</h2><p className="mt-1 text-sm text-gray-500">Review prepaid subscriptions and manage upcoming schedules.</p></div><button type="button" onClick={()=>void loadSubscriptions()} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold" style={{borderColor:'var(--line)'}}><RefreshCw className="h-3.5 w-3.5"/>Refresh</button></div>
      {subscriptions.length===0?<p className="rounded-xl p-5 text-sm text-gray-500" style={{background:'#F8F6F3'}}>You have no meal packages yet.</p>:<div className="grid gap-4 md:grid-cols-2">{subscriptions.map(sub=><article key={sub.id} className="rounded-xl border p-4" style={{borderColor:'var(--line)'}}><div className="flex items-start justify-between gap-3"><div><h3 className="font-bold">{sub.restaurant?.name??'Kitchen'}</h3><p className="mt-1 text-xs text-gray-500">{sub.package_weeks} week(s) · {sub.total_deliveries} deliveries · {sub.delivery_time}</p></div><span className="rounded-full px-2.5 py-1 text-xs font-bold capitalize" style={{background:sub.status==='active'?'#E7F6EC':sub.status==='paused'?'#FFF0E5':'#F1F1F1',color:sub.status==='active'?'#207245':sub.status==='paused'?'#B45309':'#555'}}>{sub.status.replaceAll('_',' ')}</span></div><p className="mt-3 text-sm font-semibold">{money(Number(sub.total_amount))} paid package</p><p className="mt-1 text-xs text-gray-500">Schedule: {sub.delivery_days.map(d=>DAY_OPTIONS.find(x=>x.value===d)?.label).filter(Boolean).join(', ')} · {sub.starts_on??'Start pending'} to {sub.ends_on??'End pending'}</p><div className="mt-3 space-y-1">{(sub.selected_items??[]).map(item=><p key={item.menu_item_id} className="text-xs text-gray-600">{item.quantity} × {item.name}</p>)}</div>{sub.status==='active'&&<div className="mt-4 flex gap-2"><button type="button" disabled={busy} onClick={()=>void manage(sub.id,'paused')} className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-xs font-semibold" style={{borderColor:'var(--line)'}}><Pause className="h-3 w-3"/>Pause</button><button type="button" disabled={busy} onClick={()=>{if(window.confirm('Cancel this package and cancel its remaining scheduled deliveries?'))void manage(sub.id,'cancelled')}} className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-xs font-semibold" style={{borderColor:'var(--line)',color:'#B42318'}}><XCircle className="h-3 w-3"/>Cancel</button></div>}{sub.status==='paused'&&<div className="mt-4 flex gap-2"><button type="button" disabled={busy} onClick={()=>void manage(sub.id,'active')} className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-xs font-semibold" style={{borderColor:'var(--line)',color:'#207245'}}><Play className="h-3 w-3"/>Resume</button><button type="button" disabled={busy} onClick={()=>{if(window.confirm('Cancel this package and cancel its remaining scheduled deliveries?'))void manage(sub.id,'cancelled')}} className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-xs font-semibold" style={{borderColor:'var(--line)',color:'#B42318'}}><XCircle className="h-3 w-3"/>Cancel</button></div>}</article>)}</div>}
    </section>
    <p className="mt-4 text-xs text-gray-500"><Clock3 className="mr-1 inline h-3.5 w-3.5"/>Scheduled delivery dates are reserved after payment. Order creation and delivery tracking remain subject to the subscription delivery workflow.</p>
  </main>;
}
