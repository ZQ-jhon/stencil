import { BuildCtx, Collection, CompilerCtx, Config, ConfigCollection, CopyTask, ModuleFile } from '../../declarations';
import { catchError } from '../util';
import { COLLECTION_DEPENDENCIES_DIR, parseCollectionData } from './collection-data';
import { normalizePath, pathJoin } from '../util';
import { upgradeCollection } from './upgrade-collection';


export async function loadCollections(config: Config, compilerCtx: CompilerCtx, buildCtx: BuildCtx) {
  const timeSpan = config.logger.createTimeSpan(`load collections started`, true);

  try {
    await loadConfigCollections(config, compilerCtx, buildCtx);

  } catch (e) {
    catchError(buildCtx.diagnostics, e);
  }

  timeSpan.finish(`load collections finished`);
}


export function loadConfigCollections(config: Config, compilerCtx: CompilerCtx, buildCtx: BuildCtx): Promise<Collection[]> {
  // load up all of the collections which this app is dependent on
  return Promise.all(config.collections.map(configCollection => {
    return loadConfigCollection(config, compilerCtx, buildCtx, configCollection);
  }));
}


async function loadConfigCollection(config: Config, compilerCtx: CompilerCtx, buildCtx: BuildCtx, configCollection: ConfigCollection) {

  let collection = compilerCtx.collections.find(c => c.collectionName === configCollection.name);
  if (collection) {
    // we've already cached the collection, no need for another resolve/readFile/parse
    return collection;
  }

  // figure out the path to the dependent collection's package.json
  const collectionJsonFilePath = config.sys.resolveModule(config.rootDir, configCollection.name);

  // parse the dependent collection's package.json
  const packageJsonStr = await compilerCtx.fs.readFile(collectionJsonFilePath);
  const packageData = JSON.parse(packageJsonStr);

  // verify this package has a "collection" property in its package.json
  if (!packageData.collection) {
    throw new Error(`stencil collection "${configCollection.name}" is missing the "collection" key from its package.json: ${collectionJsonFilePath}`);
  }

  // get the root directory of the dependency
  const collectionPackageRootDir = config.sys.path.dirname(collectionJsonFilePath);

  // figure out the full path to the collection collection file
  const collectionFilePath = pathJoin(config, collectionPackageRootDir, packageData.collection);

  config.logger.debug(`load colleciton: ${collectionFilePath}`);

  // we haven't cached the collection yet, let's read this file
  const collectionJsonStr = await compilerCtx.fs.readFile(collectionFilePath);

  // get the directory where the collection collection file is sitting
  const collectionDir = normalizePath(config.sys.path.dirname(collectionFilePath));

  // parse the json string into our collection data
  collection = parseCollectionData(
    config,
    configCollection.name,
    configCollection.includeBundledOnly,
    collectionDir,
    collectionJsonStr
  );

  // append any collection data
  collection.moduleFiles.forEach(collectionModuleFile => {
    if (!compilerCtx.moduleFiles[collectionModuleFile.jsFilePath]) {
      compilerCtx.moduleFiles[collectionModuleFile.jsFilePath] = collectionModuleFile;
    }
  });

  // Look at all dependent components from outside collections and
  // upgrade the components to be compatible with this version if need be
  await upgradeCollection(config, compilerCtx, buildCtx, collection);

  if (config.generateDistribution) {
    await copySourceCollectionComponentsToDistribution(config, compilerCtx, collection.moduleFiles);
  }

  // cache it for later yo
  compilerCtx.collections.push(collection);

  // so let's recap: we've read the file, parsed it apart, and cached it, congrats
  return collection;
}


async function copySourceCollectionComponentsToDistribution(config: Config, compilerCtx: CompilerCtx, modulesFiles: ModuleFile[]) {
  // for any components that are dependencies, such as ionicons is a dependency of ionic
  // then we need to copy the dependency to the dist so it just works downstream

  const copyTasks: CopyTask[] = [];

  const collectionModules = modulesFiles.filter(m => m.isCollectionDependency && m.originalCollectionComponentPath);

  collectionModules.forEach(m => {
    copyTasks.push({
      src: m.jsFilePath,
      dest: config.sys.path.join(
        config.collectionDir,
        COLLECTION_DEPENDENCIES_DIR,
        m.originalCollectionComponentPath
      )
    });

    if (m.cmpMeta && m.cmpMeta.stylesMeta) {
      const modeNames = Object.keys(m.cmpMeta.stylesMeta);
      modeNames.forEach(modeName => {
        const styleMeta = m.cmpMeta.stylesMeta[modeName];

        if (styleMeta.externalStyles) {
          styleMeta.externalStyles.forEach(externalStyle => {
            copyTasks.push({
              src: externalStyle.absolutePath,
              dest: config.sys.path.join(
                config.collectionDir,
                COLLECTION_DEPENDENCIES_DIR,
                externalStyle.originalCollectionPath
              )
            });
          });
        }
      });
    }

  });

  await Promise.all(copyTasks.map(async copyTask => {
    await compilerCtx.fs.copy(copyTask.src, copyTask.dest);
  }));
}
