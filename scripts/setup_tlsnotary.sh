cd pagesigner-cli
npm i
cd ../tlsnotaryserver/src
go mod tidy
go build notary.go
