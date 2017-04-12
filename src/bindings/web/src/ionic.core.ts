import { ConfigController } from '../../../client/config-controller';
import { DomController } from '../../../client/dom-controller';
import { Ionic } from '../../../util/interfaces';
import { NextTickController } from '../../../client/next-tick-controller';
import { PlatformClient } from '../../../client/platform-client';
import { registerComponents } from '../../../client/registry';
import { Renderer } from '../../../client/renderer/core';


const ionic: Ionic = (<any>window).Ionic = (<any>window).Ionic || {};

const domCtrl = DomController(window);

const nextTickCtrl = NextTickController(window);

const plt = PlatformClient(window, document, ionic, ionic.staticDir, domCtrl, nextTickCtrl);

const renderer = Renderer(plt);

const configCtrl = ConfigController(ionic.config || {});

registerComponents(renderer, plt, configCtrl, ionic.components);