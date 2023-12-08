const express = require("express");
const router = express.Router();

const { signJWT, verifyJWT, decodeJWT } = require("../utils/jwt");
const { extractJWTPubKeyFromDnsTxt } = require("../utils/dns");

router.post("/generate", (req, res) => {
  try {
    const tokenOutput = signJWT(req.body);
    res.send({
      token: tokenOutput,
    });
  } catch (err) {
    console.log(err);
    res.status(500).send({ message: err.message });
  }
});

router.post("/verify", async (req, res) => {
  try {
    requestToken = req.body.token;
    const decodeToken = decodeJWT(requestToken);
    const domain = decodeToken.iss;
    const publicKeys = await extractJWTPubKeyFromDnsTxt(domain);
    const decoded = await verifyJWT(requestToken, publicKeys);
    if (!decoded) {
      res.status(401).send({ message: "Invalid token" });
      return;
    }
    res.send({ payload: decoded });
  } catch (err) {
    console.log(err);
    res.send({ message: err.message });
  }
});

router.post("/fetch-sign", (req, res) => {
  try {
    const authToken = req.body.auth_token;
    const signToken = signJWT(decodeJWT(authToken));
    res.send({
      auth_token: authToken,
      fetch_signature: signToken.split(".")[2],
    });
  } catch (err) {
    console.log(err);
    res.status(err.status || 400).send({ message: err.message });
  }
});

router.post("/fetch-verify", async (req, res) => {
  try {
    const authToken = req.body.auth_token;
    const decodeToken = decodeJWT(authToken);
    const domain = decodeToken.iss;
    const publicKeys = await extractJWTPubKeyFromDnsTxt(domain);
    const decodedAuth = await verifyJWT(authToken, publicKeys);
    if (!decodedAuth) {
      res.status(401).send({ message: "Invalid auth token" });
      return;
    }
    // verify fetch signature by replace auth token jwt signature with fetch signature
    const fetchSignature = req.body.fetch_signature;
    splitToken = authToken.split(".");
    const fetchToken = `${splitToken[0]}.${splitToken[1]}.${fetchSignature}`;
    const fetcherDomain = req.body.fetch_domain;
    const fetcherPublicKeys = await extractJWTPubKeyFromDnsTxt(fetcherDomain);
    const decodedFetchToken = await verifyJWT(fetchToken, fetcherPublicKeys);
    if (!decodedFetchToken) {
      res.status(401).send({ message: "Invalid fetch signature" });
      return;
    }
    res.send({ payload: decodedAuth, valid: true });
  } catch (err) {
    console.log(err);
    res.status(err.status || 400).send({ message: err.message });
  }
});

module.exports = router;
