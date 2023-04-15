'use strict';

class ApplicationLayerHandler {

    /* eslint-disable no-unused-vars */

    isApplicable(telegram, rawData) {
        return false;
    }

    decode(telegram, rawData) {
        telegram.applicationLayer.manufacturerSpecificHandler = true;
    }

    /* eslint-enable no-unused-vars */

    createDefaultDataRecord(vif, value, type, unit) {
        return {
            type: type,
            value: type === 'number' ? value : 0,
            stringValue: type !== 'number' ? value : '',
            header: {
                dib: {
                    dataField: 0,
                    devUnit: 0,
                    functionField: 0,
                    storageNo: 0,
                    tariff: 0
                },
                vib: [{
                    extensionFollows: false,
                    plain: typeof unit === 'undefined' ? '' : unit,
                    table: typeof unit === 'undefined' ? 'primary' : 'plain',
                    vif: typeof unit === 'undefined' ? vif : 0x7C
                }],
                length: 0,
                offset: 0
            }
        };
    }
}

module.exports = ApplicationLayerHandler;