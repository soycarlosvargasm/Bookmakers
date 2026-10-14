import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {dirname,join} from 'node:path';
import ts from 'typescript';

/** The native opener needs only Node built-ins and the public source catalog.
 * Bundle it so opening pages never depends on reading the Desktop project. */
export async function installCountryPagesBundle(project:string,resources:string){
  const root=join(resources,'express');await mkdir(root,{recursive:true});
  await writeFile(join(root,'package.json'),JSON.stringify({type:'module',private:true}));
  for(const file of ['src/ui/open-country.ts','src/ui/country-pages.ts','src/ui/brands.ts','src/ui/countries.ts','src/engine/renzo-browser.ts']){
    const source=await readFile(join(project,file),'utf8'),target=join(root,file.replace(/\.ts$/,'.js'));
    await mkdir(dirname(target),{recursive:true});
    const compiled=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
    await writeFile(target,compiled);
  }
  await mkdir(join(root,'config'),{recursive:true});await writeFile(join(root,'config','brands.json'),await readFile(join(project,'config','brands.json')));
}
