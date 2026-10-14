// Native shell fallback for opening pages while an older collector is still running.
import {openRenzoPages} from './country-pages.js';
import {loadBrands} from './brands.js';import {findCountry,groupCountries} from './countries.js';
try {
  const country=findCountry(process.argv[2]);if(!country)throw Error('País de fuentes no válido.');
  const group=groupCountries(await loadBrands()).find(c=>c.code===country.code)!;
  const result=await openRenzoPages(group.brands.map(b=>b.region.url));
  process.stdout.write(JSON.stringify({country:country.code,name:country.name,opened:result.opened,mode:'express',message:`${result.opened} ${result.opened===1?'pestaña abierta':'pestañas abiertas'} en Chrome Renzo. Las páginas cargan a la vez.`}));
}catch(error){process.stdout.write(JSON.stringify({error:(error as Error).message}));process.exitCode=1;}
