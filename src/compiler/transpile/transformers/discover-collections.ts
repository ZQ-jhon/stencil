import { CompilerCtx, Config } from '../../../declarations';
import * as ts from 'typescript';


export function discoverCollections(config: Config, compilerCtx: CompilerCtx): ts.TransformerFactory<ts.SourceFile> {

  return (transformContext) => {

    function visitImport(importNode: ts.ImportDeclaration) {
      if (!importNode.moduleSpecifier) {
        return importNode;
      }

      const moduleId = importNode.moduleSpecifier.getText().replace(/(\'|\"|\`)/g, '');

      if (moduleId.startsWith('.') || moduleId.startsWith('/')) {
        // not a node module import, so don't bother
        return importNode;
      }

      if (compilerCtx.resolvedModuleIds.includes(moduleId)) {
        // we've already handled this import before
        return importNode;
      }

      // cache that we've already done this once
      compilerCtx.resolvedModuleIds.push(moduleId);

      let resolvedModule: string;

      try {
        // get the full package.json file path
        resolvedModule = config.sys.resolveModule(config.rootDir, moduleId);

      } catch (e) {
        // it's someone else's job to handle unresolvable paths
        return importNode;
      }

      // open up and parse the package.json
      const packageJsonStr = compilerCtx.fs.readFileSync(resolvedModule);
      const packageJson = JSON.parse(packageJsonStr);

      if (!packageJson.collection) {
        // this import is not a stencil collection
        return importNode;
      }

      console.log(packageJson)

      return importNode;
    }


    function visit(node: ts.Node): ts.VisitResult<ts.Node> {
      switch (node.kind) {
        case ts.SyntaxKind.ImportDeclaration:
          return visitImport(node as ts.ImportDeclaration);
        default:
          return ts.visitEachChild(node, visit, transformContext);
      }
    }

    return (tsSourceFile) => {
      return visit(tsSourceFile) as ts.SourceFile;
    };
  };

}
