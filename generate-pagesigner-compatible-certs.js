/* eslint-disable */

// This script takes Node.js embedded root certificates and transforms them
// into a format compatible with pagesigner. See electron/proverlib/pagesigner/core/third-party/certs.txt for an example
// of this certs file.
// Since none of the fields or headers except for the PEMs are actually used, they're generated empty.

// Run this script with node, the output will be in ./certs.txt. Then you can place it in your static files directory.

const { rootCertificates } = require('tls');
const crypto = require('crypto');
const fs = require('fs');

const asn1js = require('asn1js');
const { Certificate, setEngine, CryptoEngine } = require('pkijs');

setEngine('nodeCrypto', new CryptoEngine({ name: 'nodeCrypto', crypto }));

function b64decode(str) {
  return new Uint8Array(Buffer.from(str, 'base64'));
}

function pem2ba(pem) {
  var lines = pem.split('\n');
  var encoded = '';
  for(let line of lines){
    if (line.trim().length > 0 &&
        line.indexOf('-BEGIN CERTIFICATE-') < 0 &&
        line.indexOf('-BEGIN PUBLIC KEY-') < 0 &&
        line.indexOf('-END PUBLIC KEY-') < 0 &&
        line.indexOf('-END CERTIFICATE-') < 0 ) {
      encoded += line.trim();
    }
  }
  return b64decode(encoded);
}

function parse_certs(text) {
  const lines = text.split('"\n"').slice(1); // discard the first line - headers

  const chain = [];
  for (const line of lines) {
    const fields = line.split('","');
    const pem = fields[32].slice(1, -1);
    const asn1cert = asn1js.fromBER(pem2ba(pem).buffer);
    chain.push(new Certificate({ schema: asn1cert.result }));
  }

  return chain;
}

const header = '"Owner","Certificate Issuer Organization","Certificate Issuer Organizational Unit","Common Name or Certificate Name","Certificate Serial Number","SHA-256 Fingerprint","Subject + SPKI SHA256","Valid From [GMT]","Valid To [GMT]","Public Key Algorithm","Signature Hash Algorithm","Trust Bits","Distrust for TLS After Date","Distrust for S/MIME After Date","EV Policy OID(s)","Approval Bug","NSS Release When First Included","Firefox Release When First Included","Test Website - Valid","Test Website - Expired","Test Website - Revoked","Mozilla Applied Constraints","Company Website","Geographic Focus","Certificate Policy (CP)","Certification Practice Statement (CPS)","Standard Audit","BR Audit","EV Audit","Auditor","Standard Audit Type","Standard Audit Statement Dt","PEM Info"';

function main() {
  const output = [header];
  for (const cert of rootCertificates) {
    const dummyInfo = new Array(32).fill('""');
    dummyInfo.push(`"'${cert}'"`);
    const chainItem = dummyInfo.join(',');
    output.push(chainItem);
  }

  fs.writeFileSync('certs.txt', Buffer.from(output.join('\n')).toString('utf8'));

  // test the output
  const testOutput = fs.readFileSync('./certs.txt', { encoding: 'utf8' });
  const chain = parse_certs(testOutput);

  if (chain.length === 0) throw new Error('failed to create a compatible certs chain file');
  console.log('Successfully generated pagesigner-compatible certs file');
}

main();
