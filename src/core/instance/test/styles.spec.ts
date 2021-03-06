import { attachStyles, initStyleTemplate } from '../styles';
import { ComponentConstructor, ComponentMeta, DomApi, HostElement } from '../../../declarations';
import { mockDomApi, mockElement } from '../../../testing/mocks';


describe('styles', () => {

  let domApi: DomApi;
  let elm: HostElement;
  let cmpMeta: ComponentMeta;

  beforeEach(() => {
    domApi = mockDomApi();
    elm = mockElement() as any;
    cmpMeta = {
      tagNameMeta: 'cmp-a'
    };
  });

  it('should place the styles in the head below multiple existing <styles data-styles>', () => {
    const cmpConstructor: ComponentConstructor = class {
      static get is() {
        return 'cmp-a';
      }
      static get style() {
        return `my-style { color: red; }`;
      }
    };
    const modeName = null;

    const visibilityStyles = domApi.$createElement('style');
    visibilityStyles.setAttribute('data-styles', '');
    visibilityStyles.innerHTML = `cmp-a { visibility: hidden; }`;
    domApi.$appendChild(domApi.$head, visibilityStyles);

    const prerenderStyles = domApi.$createElement('style');
    prerenderStyles.setAttribute('data-styles', '');
    prerenderStyles.innerHTML = `body { color: blue; }`;
    domApi.$appendChild(domApi.$head, prerenderStyles);

    initStyleTemplate(domApi, cmpMeta, cmpConstructor);
    attachStyles(domApi, cmpMeta, modeName, elm);

    const styles = domApi.$head.querySelectorAll('style');
    expect(styles).toHaveLength(3);

    expect(styles[0].innerHTML).toBe('cmp-a { visibility: hidden; }');
    expect(styles[1].innerHTML).toBe('body { color: blue; }');
    expect(styles[2].innerHTML).toBe('my-style { color: red; }');
  });

  it('should place the styles in the head below an existing <styles data-styles>', () => {
    const cmpConstructor: ComponentConstructor = class {
      static get is() {
        return 'cmp-a';
      }
      static get style() {
        return `my-style { color: red; }`;
      }
    };
    const modeName = null;

    const prerenderStyles = domApi.$createElement('style');
    prerenderStyles.setAttribute('data-styles', '');
    prerenderStyles.innerHTML = `body { color: blue; }`;
    domApi.$appendChild(domApi.$head, prerenderStyles);

    initStyleTemplate(domApi, cmpMeta, cmpConstructor);
    attachStyles(domApi, cmpMeta, modeName, elm);

    const styles = domApi.$head.querySelectorAll('style');
    expect(styles).toHaveLength(2);

    expect(styles[0].innerHTML).toBe('body { color: blue; }');
    expect(styles[1].innerHTML).toBe('my-style { color: red; }');
  });

  it('should place the styles in the head w/out an existing <styles data-styles>', () => {
    const cmpConstructor: ComponentConstructor = class {
      static get is() {
        return 'cmp-a';
      }
      static get style() {
        return `my-style { color: red; }`;
      }
    };
    const modeName = null;

    initStyleTemplate(domApi, cmpMeta, cmpConstructor);
    attachStyles(domApi, cmpMeta, modeName, elm);

    const style = domApi.$head.querySelector('style');
    expect(style.innerHTML).toBe(cmpConstructor.style);
  });

  it('should append component styles template to head, with styleMode', () => {
    const cmpConstructor: ComponentConstructor = class {
      static get is() {
        return 'cmp-a';
      }
      static get style() {
        return `my-style { color: red; }`;
      }
      static get styleMode() {
        return `ios`;
      }
    };

    initStyleTemplate(domApi, cmpMeta, cmpConstructor);

    const template = domApi.$head.querySelector('template');
    expect(template.innerHTML).toBe(`<style>${cmpConstructor.style}</style>`);
    expect(cmpMeta[`cmp-aios`]).toBe(template);
  });

  it('should append component styles template to head, no styleMode', () => {
    const cmpConstructor: ComponentConstructor = class {
      static get is() {
        return 'cmp-a';
      }
      static get style() {
        return `my-style { color: red; }`;
      }
    };

    initStyleTemplate(domApi, cmpMeta, cmpConstructor);

    const template = domApi.$head.querySelector('template');
    expect(template.innerHTML).toBe(`<style>${cmpConstructor.style}</style>`);
    expect(cmpMeta[`cmp-a$`]).toBe(template);
  });

  it('should not append component styles template when no styles', () => {
    const cmpConstructor: ComponentConstructor = class {
      static get is() {
        return 'cmp-a';
      }
    };

    initStyleTemplate(domApi, cmpMeta, cmpConstructor);

    const template = domApi.$head.querySelector('template');
    expect(template).toBe(null);
  });

});
