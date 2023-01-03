'use strict';

const { expect } = require('chai');
const WmbusParser = require('./WmbusParser');

function createParser(data, pos) {
    const parser = new WmbusParser();
    if (!Buffer.isBuffer(data)) {
        parser.data = Buffer.from(data, 'hex');
    } else {
        parser.data = data;
    }
    parser.dataPos = pos;
    return parser;
}

describe('Link Layer', () => {
    it('Check fields', () => {
        const parser = createParser('2E449315785634003303', 0);
        parser.decodeLinkLayer();

        expect(parser.telegram.linkLayer).to.eql({
            lField: 0x2E,
            cField: 0x44,
            mField: 0x1593,
            aField: 0x345678,
            version: 0x33,
            type: 0x03,
            addressRaw: Buffer.from('9315785634003303', 'hex'),
            aFieldRaw: Buffer.from('785634003303', 'hex'),
            manufacturer: 'ELS',
            typeString: 'Gas',
            meterId: '00345678'
        });
    });

    it('Check fields - Wired M-Bus', () => {
        const parser = createParser('68585868080516', 0);
        parser.decodeLinkLayer();

        expect(parser.telegram.linkLayer).to.eql({
            lField: 0x58,
            cField: 0x08,
            aField: 0x05
        });
    });

    it('Check fields - Wired M-Bus - after Application Layer', () => {
        const parser = createParser('6858586808057281052661A51170073E3000000C13000200008C1013000000008C2013000200003B3BDDBDEB0B26504701025ADB000266B900046D0C0B752B4C1300020000CC101300000000CC201300020000426C5F2C42EC7E7F2CDD16', 0);
        parser.decodeLinkLayer();
        parser.decodeApplicationLayer();

        expect(parser.telegram.linkLayer).to.eql({
            lField: 0x58,
            cField: 0x08,
            mField: 0x11A5,
            aField: 0x05,
            version: 0x70,
            type: 0x07,
            addressRaw: Buffer.from('A511810526617000', 'hex'),
            aFieldRaw: Buffer.from('810526617000', 'hex'),
            manufacturer: 'DME',
            typeString: 'Water',
            meterId: '02001312'
        });
    });
});

describe('Extended Link Layer', () => {
    it('CI does not match', () => {
        const parser = createParser(Buffer.alloc(12), 0);
        parser.decodeExtendedLinkLayer();

        expect(parser.telegram.extendedLinkLayer).to.be.empty;
    });

    it('Check fields - CI ELL_2', () => {
        const parser = createParser(Buffer.from('1444AE0C7856341201078C2027780B13436587', 'hex'), 10);
        parser.decodeExtendedLinkLayer();

        expect(parser.telegram.extendedLinkLayer).to.eql({
            ci: 0x8C,
            communicationControl: 32,
            accessNumber: 39
        });
    });

    it('ELL Encryption', () => {
        const parser = createParser(Buffer.from('24442D2C692845631B168D3050209CD621B006B1140AEF4953AE5B86FAFC0B00E70705B846', 'hex'), 0);
        parser.aesKey = Buffer.from('4E5508544202058100DFEFA06B0934A5', 'hex');
        parser.decodeLinkLayer();
        parser.decodeExtendedLinkLayer();

        expect(parser.telegram.extendedLinkLayer).to.eql({
            ci: 0x8D,
            communicationControl: 48,
            accessNumber: 80,
            sessionNumber: 567712800,
            sessionNumberEnc: 1,
            sessionNumberTime: 1927618,
            sessionNumberSession: 0
        });
    });

    it('ELL Encryption - already decrypted', () => {
        const parser = createParser(Buffer.from('3F442D2C06357260190C8D207C71032F21255C79DD829283011117650000BFA80000D24F0000B1FB00000000E919FF18F7640000E8FA00000B000000DB111C0B', 'hex'), 0);
        parser.decodeLinkLayer();
        parser.decodeExtendedLinkLayer();

        expect(parser.telegram.extendedLinkLayer).to.eql({
            ci: 0x8D,
            communicationControl: 32,
            accessNumber: 124,
            sessionNumber: 556729201,
            sessionNumberEnc: 1,
            sessionNumberTime: 1241143,
            sessionNumberSession: 1
        });
    });

    describe('Authentication and Fragmentation Layer', () => {
        it('CI does not match', () => {
            const parser = createParser(Buffer.alloc(12), 0);
            parser.decodeAuthenticationAndFragmentationLayer();

            expect(parser.telegram.authenticationAndFragmentationLayer).to.be.empty;
        });

        it('Check fields', () => {
            const parser = createParser(Buffer.from('900F002C25B30A000021924D4F2FB66E01', 'hex'), 0);
            parser.decodeAuthenticationAndFragmentationLayer();

            expect(parser.telegram.authenticationAndFragmentationLayer).to.eql({
                ci: 0x90,
                afll: 0x0F,
                fcl: 0x2C00,
                fclMf: false,
                fclMclp: true,
                fclMlp: false,
                fclMcrp: true,
                fclMacp: true,
                fclKip: false,
                fclFid: 0,
                mcl: 0x25,
                mclMlmp: false,
                mclMcmp: true,
                mclKimp: false,
                mclAt: (5),
                mcr: 0x00000AB3,
                mac: Buffer.from('21924D4F2FB66E01', 'hex'),
            });
        });
    });

    describe('Application Layer', () => {
        it('CI does not match', () => {
            const parser = createParser(Buffer.alloc(12), 0);

            expect(() => parser.decodeApplicationLayer()).to.throw('Unsupport CI Field 0x0\nremaining payload is 0000000000000000000000');
        });

        it('Check fields - Short header', () => {
            const parser = createParser(Buffer.from('7A000000002F2F0A66360202FD971D00002F2F2F2F', 'hex'), 0);
            parser.decodeApplicationLayer();

            expect(parser.telegram.applicationLayer).to.eql({
                ci: 0x7A,
                offset: 0,
                accessNo: 0,
                status: 0,
                statusString: 'No error'
            });

            expect(parser.telegram.config).to.eql({
                mode: 0,
                bidirectional: 0,
                accessability: 0,
                synchronous: 0,
                encryptedBlocks: 0,
                content: 0,
                hopCounter: 0
            });
        });

        it('Check fields - Long header', () => {
            const parser = createParser(Buffer.from('72150101003330021d880400402f2f0e6e1001000000002f2f2f2f2f2f', 'hex'), 0);
            parser.decodeApplicationLayer();

            expect(parser.telegram.applicationLayer).to.eql({
                ci: 0x72,
                offset: 0,
                accessNo: 136,
                status: 0x04,
                statusString: 'error state 0x4',
                meterId: 0x010115,
                meterManufacturer: 0x3033,
                meterVersion: 2,
                meterDevice: 29,
                meterIdString: '74143535',
                meterDeviceString: 'Reserved for sensors',
                meterManufacturerString: 'LAS'
            });

            expect(parser.telegram.config).to.eql({
                mode: 0,
                bidirectional: 0,
                accessability: 1,
                synchronous: 0,
                encryptedBlocks: 0,
                content: 0,
                hopCounter: 0
            });
        });

        it('Encryption Mode 5 / Security profile A', () => {
            const parser = createParser(Buffer.from('2E4493157856341233037A2A0020255923C95AAA26D1B2E7493B013EC4A6F6D3529B520EDFF0EA6DEFC99D6D69EBF3', 'hex'), 0);
            parser.aesKey = Buffer.from('0102030405060708090A0B0C0D0E0F11', 'hex');
            parser.decodeLinkLayer();
            parser.decodeApplicationLayer();

            expect(parser.telegram.applicationLayer).to.eql({
                ci: 0x7A,
                offset: 10,
                accessNo: 42,
                status: 0,
                statusString: 'No error',
            });

            expect(parser.telegram.config).to.eql({
                mode: 5,
                bidirectional: 0,
                accessability: 0,
                synchronous: 1,
                encryptedBlocks: 2,
                content: 0,
                hopCounter: 0
            });
        });

        it('Encryption Mode 7 / Security profile B', () => {
            const parser = createParser(Buffer.from('434493157856341233038C2075900F002C25B30A000021924D4F2FB66E017A75002007109058475F4BC91DF878B80A1B0F98B629024AAC727942BFC549233C0140829B93', 'hex'), 0);
            parser.aesKey = Buffer.from('000102030405060708090A0B0C0D0E0F', 'hex');
            parser.decodeLinkLayer();
            parser.decodeExtendedLinkLayer();
            parser.decodeAuthenticationAndFragmentationLayer();
            parser.decodeApplicationLayer();

            expect(parser.telegram.applicationLayer).to.eql({
                ci: 0x7A,
                offset: 30,
                accessNo: 117,
                status: 0,
                statusString: 'No error',
            });

            expect(parser.telegram.config).to.eql({
                mode: 7,
                encryptedBlocks: 2,
                content: 0,
                kdfSel: 1,
                keyid: 0
            });
        });

        it('Encryption Mode 7 - MAC does not match', () => {
            const parser = createParser(Buffer.from('434493157856341233038C2075900F002C25B30A000021924D4F3FB66E017A75002007109058475F4BC91DF878B80A1B0F98B629024AAC727942BFC549233C0140829B93', 'hex'), 0);
            parser.aesKey = Buffer.from('000102030405060708090A0B0C0D0E0F', 'hex');
            parser.decodeLinkLayer();
            parser.decodeExtendedLinkLayer();
            parser.decodeAuthenticationAndFragmentationLayer();

            expect(() => parser.decodeApplicationLayer()).to.throw('Received MAC does not match. Corrupted data?\nMAC received: 21924d4f3fb66e01');
        });
    });

    describe('Raw Data Records', () => {
        it('Single value - Temperature', () => {
            const parser = createParser(Buffer.from('0266d900', 'hex'), 0);
            parser.decodeDataRecords();

            const result = parser.telegram.dataRecords;

            expect(result).to.have.lengthOf(1);
            expect(result[0].stringValue).to.eql('');
            expect(result[0].type).to.eql('number');
            expect(result[0].value).to.eql(217);

            expect(result[0].header).to.eql({
                dib: {
                    dataField: 2,
                    devUnit: 0,
                    functionField: 0,
                    storageNo: 0,
                    tariff: 0
                },
                vib: [{
                    extensionFollows: false,
                    plain: '',
                    table: 'primary',
                    vif: 102
                }],
                length: 2,
                offset: 0
            });
        });
    });

});

