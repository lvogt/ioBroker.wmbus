'use strict';

const { expect } = require('chai');
const handleCrc = require('./WmbusCrcHelper');

describe('Test CRC Helper -- CRC unknown', () => {
    it('Frame Type A with CRC', () => {
        const data = Buffer.from('2E44931578563412330333637A2A0020255923C95AAA26D1B2E7493BC2AD013EC4A6F6D3529B520EDFF0EA6DEFC955B29D6D69EBF3EC8A', 'hex');
        const expected = Buffer.from('2E4493157856341233037A2A0020255923C95AAA26D1B2E7493B013EC4A6F6D3529B520EDFF0EA6DEFC99D6D69EBF3', 'hex');

        const strippedData = handleCrc(data);

        expect(strippedData).to.be.eql(expected);

    });

    it('Frame Type A with CRC and trailing data', () => {
        const data = Buffer.from('2E44931578563412330333637A2A0020255923C95AAA26D1B2E7493BC2AD013EC4A6F6D3529B520EDFF0EA6DEFC955B29D6D69EBF3EC8A1234', 'hex');
        const expected = Buffer.from('2E4493157856341233037A2A0020255923C95AAA26D1B2E7493B013EC4A6F6D3529B520EDFF0EA6DEFC99D6D69EBF3', 'hex');

        const strippedData = handleCrc(data);

        expect(strippedData).to.be.eql(expected);

    });

    it('Frame Type B with CRC', () => {
        const data = Buffer.from('1444AE0C7856341201078C2027780B134365877AC5', 'hex');
        const expected = Buffer.from('1444AE0C7856341201078C2027780B13436587', 'hex');

        const strippedData = handleCrc(data);
        expect(strippedData).to.be.eql(expected);
    });

    it('Frame Type B with CRC and 3rd block', () => {
        const data = Buffer.from('8644AE0C7856341201078C2027780B134365877AC5111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111E6781234567890F4EE', 'hex');
        const expected = Buffer.from('8644AE0C7856341201078C2027780B134365877AC51111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111234567890', 'hex');

        const strippedData = handleCrc(data);
        expect(strippedData).to.be.eql(expected);
    });

    it('Frame Type A/B without CRC', () => {
        const data = Buffer.from('2C44A7320613996707047A821000202F2F0C06000000000C14000000000C22224101000B5A4102000B5E4000F0', 'hex');

        const strippedData = handleCrc(data);

        expect(strippedData).to.be.eql(data);
    });

    it('Any frame type too short', () => {
        const data = Buffer.from('2C44A7320613996707047A821000202F2F0C06000000000C14000000000C22224101000B5A4102000B5E4000', 'hex');

        expect(() => handleCrc(data)).to.throw('Telegram data is too short! Expected at least 45 bytes, but got only 44');
    });

    it('Frame Type A with CRC but too short', () => {
        const data = Buffer.from('2E44931578563412330333637A2A0020255923C95AAA26D1B2E7493BC2AD013EC4A6F6D3529B520EDFF0EA6DEFC955B29D6D69EBF3AA', 'hex');

        expect(() => handleCrc(data)).to.throw('Telegram data is too short! Expected at least 55 bytes, but got only 54');
    });

    it('Frame Type A with wrong CRC', () => {
        const data = Buffer.from('2E44931578563412330333647A2A0020255923C95AAA26D1B2E7493BC2AD013EC4A6F6D3529B520EDFF0EA6DEFC955B29D6D69EBF3EC8A', 'hex');

        expect(() => handleCrc(data)).to.throw('Frame type A CRC check failed');
    });
});

describe('Test CRC Helper', () => {
    it('Frame Type A with CRC', () => {
        const data = Buffer.from('2E44931578563412330333637A2A0020255923C95AAA26D1B2E7493BC2AD013EC4A6F6D3529B520EDFF0EA6DEFC955B29D6D69EBF3EC8A', 'hex');
        const expected = Buffer.from('2E4493157856341233037A2A0020255923C95AAA26D1B2E7493B013EC4A6F6D3529B520EDFF0EA6DEFC99D6D69EBF3', 'hex');

        const strippedData = handleCrc(data, true);
        expect(strippedData).to.be.eql(expected);

    });

    it('Frame Type A with CRC and trailing data', () => {
        const data = Buffer.from('2E44931578563412330333637A2A0020255923C95AAA26D1B2E7493BC2AD013EC4A6F6D3529B520EDFF0EA6DEFC955B29D6D69EBF3EC8A1234', 'hex');
        const expected = Buffer.from('2E4493157856341233037A2A0020255923C95AAA26D1B2E7493B013EC4A6F6D3529B520EDFF0EA6DEFC99D6D69EBF3', 'hex');

        const strippedData = handleCrc(data, true);

        expect(strippedData).to.be.eql(expected);

    });

    it('Frame Type B with CRC', () => {
        const data = Buffer.from('1444AE0C7856341201078C2027780B134365877AC5', 'hex');
        const expected = Buffer.from('1444AE0C7856341201078C2027780B13436587', 'hex');

        const strippedData = handleCrc(data, true);
        expect(strippedData).to.be.eql(expected);
    });

    it('Frame Type B with CRC and 3rd block', () => {
        const data = Buffer.from('8644AE0C7856341201078C2027780B134365877AC5111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111E6781234567890F4EE', 'hex');
        const expected = Buffer.from('8644AE0C7856341201078C2027780B134365877AC51111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111234567890', 'hex');

        const strippedData = handleCrc(data, true);
        expect(strippedData).to.be.eql(expected);
    });

    it('Any frame type too short', () => {
        const data = Buffer.from('2C44A7320613996707047A821000202F2F0C06000000000C14000000000C22224101000B5A4102000B5E4000', 'hex');

        expect(() => handleCrc(data, true)).to.throw('Telegram data is too short! Expected at least 45 bytes, but got only 44');
    });

    it('Frame Type A with CRC but too short', () => {
        const data = Buffer.from('2E44931578563412330333637A2A0020255923C95AAA26D1B2E7493BC2AD013EC4A6F6D3529B520EDFF0EA6DEFC955B29D6D69EBF3AA', 'hex');

        expect(() => handleCrc(data, true)).to.throw('Telegram data is too short! Expected at least 55 bytes, but got only 54');
    });

    it('Frame Type A with wrong CRC', () => {
        const data = Buffer.from('2E44931578563412330333647A2A0020255923C95AAA26D1B2E7493BC2AD013EC4A6F6D3529B520EDFF0EA6DEFC955B29D6D69EBF3EC8A', 'hex');

        expect(() => handleCrc(data, true)).to.throw('Frame type A CRC check failed');
    });

    it('Frame Type B with wrong CRC', () => {
        const data = Buffer.from('1444AE0C7856341201078C2027780B134365877AC4', 'hex');

        expect(() => handleCrc(data, true)).to.throw('Frame type B CRC check failed');
    });

    it('Frame Type A without CRC but trailing data', () => {
        const data = Buffer.from('2C44A7320613996707047A821000202F2F0C06000000000C14000000000C22224101000B5A4102000B5E4000F05E123456', 'hex');
        const expected = Buffer.from('2C44A7320613996707047A821000202F2F0C06000000000C14000000000C22224101000B5A4102000B5E4000F0', 'hex');

        const strippedData = handleCrc(data, false);
        expect(strippedData).to.be.eql(expected);
    });
});

describe('Test CRC Helper - Wired M-Bus', () => {
    it('Wired M-Bus', () => {
        const data = Buffer.from('6858586808057281052661A51170073E3000000C13000200008C1013000000008C2013000200003B3BDDBDEB0B26504701025ADB000266B900046D0C0B752B4C1300020000CC101300000000CC201300020000426C5F2C42EC7E7F2CDD16', 'hex');
        const expected = Buffer.from('6858586808057281052661A51170073E3000000C13000200008C1013000000008C2013000200003B3BDDBDEB0B26504701025ADB000266B900046D0C0B752B4C1300020000CC101300000000CC201300020000426C5F2C42EC7E7F2C', 'hex');

        const strippedData = handleCrc(data);
        expect(strippedData).to.be.eql(expected);
    });

    it('Wired M-Bus - CRC fails', () => {
        const data = Buffer.from('6858586808057281052661A51170073E3000000C13000200008C1013000000008C2013000200003B3BDDBDEB0B26504701025ADB000266B900046D0C0B752B4C1300020000CC101300000000CC201300020000426C5F2C42EC7E7F2CDE16', 'hex');

        expect(() => handleCrc(data, true)).to.throw('Wired M-Bus frame CRC check failed!');
    });
});