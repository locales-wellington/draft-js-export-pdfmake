import { BLOCK_TYPE, INLINE_STYLE, getEntityRanges } from 'draft-js-utils';
import { convertFromRaw } from 'draft-js';

const { BOLD, CODE, ITALIC, STRIKETHROUGH, UNDERLINE } = INLINE_STYLE;

class StateToPdfMake {
    constructor(contentState) {
        this.contentState = convertFromRaw(contentState);
        this.currentBlock = 0;
        this.output = { content: [] };
        this.blocks = null;
        this.listOlAcc = [];
        this.listUlAcc = [];
    }

    generate() {
        this.blocks = this.contentState.getBlockMap().toArray();

        while (this.currentBlock < this.blocks.length) {
            this._processBlock();
        }

        return this.output;
    }

    _processBlock() {
        const block = this.blocks[this.currentBlock];

        const defaultHeaderStyle = { bold: true, margin: [0, 5, 0, 0] };

        if (
            block.getType() !== BLOCK_TYPE.UNORDERED_LIST_ITEM &&
            !!this.listUlAcc.length
        ) {
            this._updateAndResetUlList();
        }

        if (
            block.getType() !== BLOCK_TYPE.ORDERED_LIST_ITEM &&
            !!this.listOlAcc.length
        ) {
            this._updateAndResetOlList();
        }

        switch (block.getType()) {
            case BLOCK_TYPE.HEADER_ONE:
                this.output.content.push({
                    text: block.getText(),
                    fontSize: 24,
                    ...defaultHeaderStyle,
                });
                break;

            case BLOCK_TYPE.HEADER_TWO:
                this.output.content.push({
                    text: block.getText(),
                    fontSize: 22,
                    ...defaultHeaderStyle,
                });
                break;

            case BLOCK_TYPE.HEADER_THREE:
                this.output.content.push({
                    text: block.getText(),
                    fontSize: 20,
                    ...defaultHeaderStyle,
                });
                break;

            case BLOCK_TYPE.HEADER_FOUR:
                this.output.content.push({
                    text: block.getText(),
                    fontSize: 18,
                    ...defaultHeaderStyle,
                });
                break;

            case BLOCK_TYPE.HEADER_FIVE:
                this.output.content.push({
                    text: block.getText(),
                    fontSize: 16,
                    ...defaultHeaderStyle,
                });
                break;

            case BLOCK_TYPE.HEADER_SIX:
                this.output.content.push({
                    text: block.getText(),
                    fontSize: 14,
                    ...defaultHeaderStyle,
                });
                break;

            case BLOCK_TYPE.ORDERED_LIST_ITEM:
                {
                    const listItem = {
                        text: [...this._renderBlockContent(block)],
                    };
                    this.listOlAcc.push(listItem);
                }
                break;

            case BLOCK_TYPE.UNORDERED_LIST_ITEM:
                {
                    const listItem = {
                        text: [...this._renderBlockContent(block)],
                    };
                    const currentDepth = this._findDepth(
                        this.listUlAcc[this.listUlAcc.length - 1],
                    );
                    // if currentLength = block.depth -> push normal
                    // if +1 push in array
                    // if +2 push in 2 arrays
                    // if -1 push in previous array
                    // c[current][][][];
                    let dif = block.depth - currentDepth;
                    console.log(block.depth, currentDepth, dif);
                    if (currentDepth === 0 && !dif) {
                        console.log(this.listUlAcc);
                        this.listUlAcc.ul.push(listItem);
                    } else if (dif > 0) {
                        let tmpItem = listItem;
                        while (dif) {
                            tmpItem = { ul: [tmpItem] };
                            dif--;
                        }
                        this._insertAtDepth(
                            this.listUlAcc,
                            tmpItem,
                            currentDepth,
                        );
                    } else if (dif < 0) {
                        this._insertAtDepth(
                            this.listUlAcc,
                            listItem,
                            block.depth,
                        );
                    }
                }
                break;

            default:
                const data = this._renderBlockContent(block);

                this.output.content.push(
                    !!data.length ? { text: [...data] } : { text: '\n' },
                );
        }

        // Clear lists when is last block
        if (block.getKey() === this.contentState.getLastBlock().getKey()) {
            if (!!this.listUlAcc.length) {
                this._updateAndResetUlList();
            }

            if (!!this.listOlAcc.length) {
                this._updateAndResetOlList();
            }
        }

        this.currentBlock += 1;
    }

    _renderBlockContent(block) {
        if (block.getText() === '') {
            return [];
        }

        const ranges = getEntityRanges(
            block.getText(),
            block.getCharacterList(),
        );

        return ranges.reduce((acc, [entityKey, stylePieces]) => {
            acc.push(
                ...stylePieces
                    .map(([text, style]) => {
                        return {
                            text: this._encodeContent(text),
                            bold: style.has(BOLD),
                            italics: style.has(ITALIC),
                            decoration: this._getTextDecorations(style),
                        };
                    })
                    .filter(properties => properties.text !== ' '),
            );

            return acc;
        }, []);
    }

    _getTextDecorations(style) {
        const object = {
            [UNDERLINE]: 'underline',
            [STRIKETHROUGH]: 'lineThrough',
        };

        return Object.keys(object).reduce((acc, key) => {
            if (style.has(key)) {
                acc.push(object[key]);
            }

            return acc;
        }, []);
    }

    _encodeContent(text) {
        return text.replace(/[*_`]/g, '\\$&');
    }

    _updateAndResetUlList() {
        this.output.content.push(this.listUlAcc);
        this.listUlAcc = { ul: [] };
    }

    _updateAndResetOlList() {
        this.output.content.push({ ol: this.listOlAcc });
        this.listOlAcc = [];
    }

    _insertAtDepth(obj, item, depth) {
        if (!depth) {
            console.log('Obj', obj);
            obj.ul.push(item);
        } else {
            this._insertAtDepth(obj.ul[obj.ul.length - 1], item, depth - 1);
        }
    }

    _findDepth(mightBeArray, currentDepth = 0) {
        if (Array.isArray(mightBeArray)) {
            return this._findDepth(
                mightBeArray[mightBeArray.length - 1],
                currentDepth + 1,
            );
        } else {
            return currentDepth;
        }
    }
}

export default StateToPdfMake;
