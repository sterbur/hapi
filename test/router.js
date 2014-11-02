// Load modules

var Code = require('code');
var Hapi = require('..');
var Lab = require('lab');


// Declare internals

var internals = {};


// Test shortcuts

var lab = exports.lab = Lab.script();
var describe = lab.describe;
var it = lab.it;
var expect = Code.expect;


describe('Router', function () {

    it('throws an error when a new route conflicts with an existing route', function (done) {

        var fn = function () {

            var server = Hapi.createServer();
            server.route({ path: '/test/{p}/{p}/end', method: 'put', handler: function () { } });
            server.route({ path: '/test/{p*2}/end', method: 'put', handler: function () { } });
        };
        expect(fn).to.throw();
        done();
    });

    it('does not throw an error when routes differ in case and case is sensitive', function (done) {

        var fn = function () {

            var server = new Hapi.Connection({ router: { isCaseSensitive: true } });
            server.route({ path: '/test/{p}/End', method: 'put', handler: function () { } });
            server.route({ path: '/test/{p}/end', method: 'put', handler: function () { } });
        };
        expect(fn).to.not.throw();
        done();
    });

    it('throws an error when routes differ in case and case is insensitive', function (done) {

        var fn = function () {

            var server = new Hapi.Connection({ router: { isCaseSensitive: false } });
            server.route({ path: '/test/{p}/End', method: 'put', handler: function () { } });
            server.route({ path: '/test/{p}/end', method: 'put', handler: function () { } });
        };
        expect(fn).to.throw();
        done();
    });

    it('throws an error when route params differ in case and case is sensitive', function (done) {

        var fn = function () {

            var server = new Hapi.Connection({ router: { isCaseSensitive: true } });
            server.route({ path: '/test/{P}/end', method: 'put', handler: function () { } });
            server.route({ path: '/test/{p}/end', method: 'put', handler: function () { } });
        };
        expect(fn).to.throw();
        done();
    });

    it('does not lowercase params when case is insensitive', function (done) {

        var server = new Hapi.Connection({ router: { isCaseSensitive: false } });
        server.route({
            path: '/test/{userId}/end', method: 'put', handler: function (request) {

                expect(request.params.userId).to.exist();
                done();
            }
        });

        server.inject({ url: '/test/2100/end', method: 'PUT' }, function () {

        });
    });

    it('matches HEAD routes', function (done) {

        var server = Hapi.createServer();
        server.route({ method: 'GET', path: '/head', handler: function (request, reply) { reply('ok-common'); } });
        server.route({ method: 'GET', path: '/head', vhost: 'special.example.com', handler: function (request, reply) { reply('ok-vhost'); } });
        server.route({ method: 'GET', path: '/get', vhost: 'special.example.com', handler: function (request, reply) { reply('just-get').header('x2', '789'); } });
        server.route({ method: 'HEAD', path: '/head', handler: function (request, reply) { reply('ok').header('x1', '123'); } });
        server.route({ method: 'HEAD', path: '/head', vhost: 'special.example.com', handler: function (request, reply) { reply('ok').header('x1', '456'); } });

        server.inject({ method: 'HEAD', url: 'http://special.example.com/head' }, function (res) {

            expect(res.headers.x1).to.equal('456');

            server.inject('http://special.example.com/head', function (res) {

                expect(res.result).to.equal('ok-vhost');
                expect(res.headers.x1).to.not.exist();

                server.inject({ method: 'HEAD', url: '/head' }, function (res) {

                    expect(res.headers.x1).to.equal('123');

                    server.inject('/head', function (res) {

                        expect(res.result).to.equal('ok-common');
                        expect(res.headers.x1).to.not.exist();

                        server.inject({ method: 'HEAD', url: 'http://special.example.com/get' }, function (res) {

                            expect(res.payload).to.equal('');
                            expect(res.result).to.equal(null);
                            expect(res.headers.x2).to.equal('789');
                            done();
                        });
                    });
                });
            });
        });
    });

    it('fails to match head request', function (done) {

        var server = Hapi.createServer();

        server.inject({ method: 'HEAD', url: '/' }, function (res) {

            expect(res.statusCode).to.equal(404);
            done();
        });
    });

    it('matches vhost route', function (done) {

        var server = Hapi.createServer();
        server.route({ method: 'GET', path: '/', vhost: 'special.example.com', handler: function (request, reply) { reply('special'); } });
        server.route({ method: 'GET', path: '/', vhost: ['special1.example.com', 'special2.example.com', 'special3.example.com'], handler: function (request, reply) { reply('special array'); } });
        server.route({ method: 'GET', path: '/', handler: function (request, reply) { reply('plain'); } });

        server.inject({ method: 'GET', url: '/', headers: { host: 'special.example.com' } }, function (res) {

            expect(res.result).to.equal('special');
            done();
        });
    });

    it('matches global route when vhost is present but not matching', function (done) {

        var server = Hapi.createServer();
        server.route({ method: 'GET', path: '/', vhost: 'special.example.com', handler: function (request, reply) { reply('special'); } });
        server.route({ method: 'GET', path: '/', vhost: ['special1.example.com', 'special2.example.com', 'special3.example.com'], handler: function (request, reply) { reply('special array'); } });
        server.route({ method: 'GET', path: '/a', handler: function (request, reply) { reply('plain').header('x1', '123'); } });

        server.inject({ method: 'HEAD', url: '/a', headers: { host: 'special.example.com' } }, function (res) {

            expect(res.payload).to.equal('');
            expect(res.result).to.equal(null);
            expect(res.headers.x1).to.equal('123');
            done();
        });
    });

    it('fails to match route when vhost is present but not matching', function (done) {

        var server = Hapi.createServer();
        server.route({ method: 'GET', path: '/', vhost: 'special.example.com', handler: function (request, reply) { reply('special'); } });
        server.route({ method: 'GET', path: '/', vhost: ['special1.example.com', 'special2.example.com', 'special3.example.com'], handler: function (request, reply) { reply('special array'); } });
        server.route({ method: 'GET', path: '/a', handler: function (request, reply) { reply('plain'); } });

        server.inject({ method: 'GET', url: '/b', headers: { host: 'special.example.com' } }, function (res) {

            expect(res.statusCode).to.equal(404);
            done();
        });
    });

    it('matches vhost route for route with array of vhosts', function (done) {

        var server = Hapi.createServer();
        server.route({ method: 'GET', path: '/', vhost: 'special.example.com', handler: function (request, reply) { reply('special'); } });
        server.route({ method: 'GET', path: '/', vhost: ['special1.example.com', 'special2.example.com', 'special3.example.com'], handler: function (request, reply) { reply('special array'); } });
        server.route({ method: 'GET', path: '/', handler: function (request, reply) { reply('plain'); } });

        server.inject({ method: 'GET', url: '/', headers: { host: 'special2.example.com:8080' } }, function (res) {

            expect(res.result).to.equal('special array');
            done();
        });
    });

    it('matches default host route', function (done) {

        var server = Hapi.createServer();
        server.route({ method: 'GET', path: '/', vhost: 'special.example.com', handler: function (request, reply) { reply('special'); } });
        server.route({ method: 'GET', path: '/', vhost: ['special1.example.com', 'special2.example.com', 'special3.example.com'], handler: function (request, reply) { reply('special array'); } });
        server.route({ method: 'GET', path: '/', handler: function (request, reply) { reply('plain'); } });

        server.inject({ method: 'GET', url: '/', headers: { host: 'example.com' } }, function (res) {

            expect(res.result).to.equal('plain');
            done();
        });
    });

    it('matches vhost to common route', function (done) {

        var server = Hapi.createServer();
        server.route({ method: 'GET', path: '/common', handler: function (request, reply) { reply('common'); } });

        server.inject({ method: 'GET', url: '/common', headers: { host: 'special.example.com' } }, function (res) {

            expect(res.result).to.equal('common');
            done();
        });
    });

    it('does not allow duplicate routes with the same vhost', function (done) {

        var server = Hapi.createServer();
        server.route({ method: 'GET', path: '/', vhost: 'special.example.com', handler: function (request, reply) { reply('special'); } });
        server.route({ method: 'GET', path: '/', vhost: ['special1.example.com', 'special2.example.com', 'special3.example.com'], handler: function (request, reply) { reply('special array'); } });
        server.route({ method: 'GET', path: '/', handler: function (request, reply) { reply('plain'); } });

        var fn = function () {

            server.route({ method: 'GET', path: '/', vhost: 'special1.example.com', handler: function (request, reply) { reply('special'); } });
        };

        expect(fn).to.throw('New route: / conflicts with existing: /');
        done();
    });

    it('does not allow conflicting routes different in trailing path (optional param in new)', function (done) {

        var server = Hapi.createServer();
        server.route({ method: 'GET', path: '/conflict1', handler: function () { } });

        var fn = function () {

            server.route({ method: 'GET', path: '/conflict1/{p?}', handler: function () { } });
        };

        expect(fn).to.throw('New route: /conflict1/{p?} conflicts with existing: /conflict1');
        done();
    });

    it('does not allow conflicting routes different in trailing path (optional param in existing)', function (done) {

        var server = Hapi.createServer();
        server.route({ method: 'GET', path: '/conflict2/{p?}', handler: function () { } });

        var fn = function () {

            server.route({ method: 'GET', path: '/conflict2', handler: function () { } });
        };

        expect(fn).to.throw('New route: /conflict2 conflicts with existing: /conflict2/{p?}');
        done();
    });

    it('does allow duplicate routes with a different vhost', function (done) {

        var server = Hapi.createServer();
        server.route({ method: 'GET', path: '/', vhost: 'special.example.com', handler: function (request, reply) { reply('special'); } });
        server.route({ method: 'GET', path: '/', vhost: ['special1.example.com', 'special2.example.com', 'special3.example.com'], handler: function (request, reply) { reply('special array'); } });
        server.route({ method: 'GET', path: '/', handler: function (request, reply) { reply('plain'); } });

        var fn = function () {

            server.route({ method: 'GET', path: '/', vhost: 'new.example.com', handler: function (request, reply) { reply('special'); } });
        };

        expect(fn).to.not.throw();
        done();
    });

    it('matches wildcard method', function (done) {

        var server = Hapi.createServer();

        server.route({ method: '*', path: '/', handler: function (request, reply) { reply('ok'); } });
        server.inject('/', function (res) {

            expect(res.statusCode).to.equal(200);
            expect(res.payload).to.equal('ok');
            done();
        });
    });

    it('matches wildcard vhost method', function (done) {

        var server = Hapi.createServer();

        server.route({ method: '*', path: '/', handler: function (request, reply) { reply('global'); } });
        server.route({ method: '*', vhost: 'special.example.com', path: '/', handler: function (request, reply) { reply('vhost'); } });
        server.inject('http://special.example.com/', function (res) {

            expect(res.statusCode).to.equal(200);
            expect(res.payload).to.equal('vhost');
            done();
        });
    });

    it('allows methods array', function (done) {

        var server = Hapi.createServer();

        var config = { method: ['HEAD', 'GET', 'PUT', 'POST', 'DELETE'], path: '/', handler: function (request, reply) { reply(request.route.method); } };
        server.route(config);
        server.inject({ method: 'HEAD', url: '/' }, function (res) {

            expect(res.statusCode).to.equal(200);

            server.inject({ method: 'GET', url: '/' }, function (res) {

                expect(res.statusCode).to.equal(200);
                expect(res.payload).to.equal('get');

                server.inject({ method: 'PUT', url: '/' }, function (res) {

                    expect(res.statusCode).to.equal(200);
                    expect(res.payload).to.equal('put');

                    server.inject({ method: 'POST', url: '/' }, function (res) {

                        expect(res.statusCode).to.equal(200);
                        expect(res.payload).to.equal('post');

                        server.inject({ method: 'DELETE', url: '/' }, function (res) {

                            expect(res.statusCode).to.equal(200);
                            expect(res.payload).to.equal('delete');
                            expect(config.method).to.deep.equal(['HEAD', 'GET', 'PUT', 'POST', 'DELETE']);
                            done();
                        });
                    });
                });
            });
        });
    });

    it('adds routes using single and array methods', function (done) {

        var server = Hapi.createServer();
        server.route([
            {
                method: 'GET',
                path: '/api/products',
                handler: function (request, reply) { reply(); }
            },
            {
                method: 'GET',
                path: '/api/products/{id}',
                handler: function (request, reply) { reply(); }
            },
            {
                method: 'POST',
                path: '/api/products',
                handler: function (request, reply) { reply(); }
            },
            {
                method: ['PUT', 'PATCH'],
                path: '/api/products/{id}',
                handler: function (request, reply) { reply(); }
            },
            {
                method: 'DELETE',
                path: '/api/products/{id}',
                handler: function (request, reply) { reply(); }
            }
        ]);

        var table = server.table()[server.info.uri];
        var paths = table.map(function (route) {
            var obj = {
                method: route.method,
                path: route.path
            };
            return obj;
        });

        expect(table).to.have.length(6);
        expect(paths).to.only.deep.include([
            { method: 'get', path: '/api/products' },
            { method: 'get', path: '/api/products/{id}' },
            { method: 'post', path: '/api/products' },
            { method: 'put', path: '/api/products/{id}' },
            { method: 'patch', path: '/api/products/{id}' },
            { method: 'delete', path: '/api/products/{id}' }
        ]);
        done();
    });

    it('does not allow invalid paths', function (done) {

        var server = Hapi.createServer();

        var fn = function () {

            server.route({ method: 'GET', path: '/%/%', handler: function () { } });
        };

        expect(fn).to.throw('Invalid path: /%/%');
        done();
    });

    it('returns 400 on invalid path', function (done) {

        var server = Hapi.createServer();
        server.route({ method: 'GET', path: '/{p*}', handler: function (request, reply) { reply('ok'); } });
        server.inject('/%/%', function (res) {

            expect(res.statusCode).to.equal(400);
            done();
        });
    });

    it('fails matching a required missing param', function (done) {

        var server = Hapi.createServer();
        server.route({ method: 'GET', path: '/a/{b}', handler: function (request, reply) { reply(request.params.b); } });

        server.inject('/a/', function (res) {

            expect(res.statusCode).to.equal(404);
            done();
        });
    });

    it('fails to return OPTIONS when cors disabled', function (done) {

        var handler = function (request, reply) {

            reply(Hapi.error.badRequest());
        };

        var server = new Hapi.Connection({ cors: false });
        server.route({ method: 'GET', path: '/', handler: handler });

        server.inject({ method: 'OPTIONS', url: '/' }, function (res) {

            expect(res.statusCode).to.equal(404);
            done();
        });
    });

    describe('NotFound', function () {

        describe('using default settings', function () {

            var server = new Hapi.Connection(0);

            it('returns 404 when making a request to a route that does not exist', function (done) {

                server.inject({ method: 'GET', url: '/nope' }, function (res) {

                    expect(res.statusCode).to.equal(404);
                    done();
                });
            });
        });

        describe('using notFound routes', function () {

            var server = new Hapi.Connection(0);
            server.route({ method: 'GET', path: '/exists/not', handler: function (request, reply) { reply(Hapi.error.notFound()); } });
            server.route({ method: 'GET', path: '/exists/{p*}', handler: function (request, reply) { reply('OK'); } });

            it('returns 404 when making a request to a notFound route', function (done) {

                server.inject({ method: 'GET', url: '/exists/not' }, function (res) {

                    expect(res.statusCode).to.equal(404);
                    done();
                });
            });

            it('returns 200 when making a request to an existing route', function (done) {

                server.inject({ method: 'GET', url: '/exists/ok' }, function (res) {

                    expect(res.statusCode).to.equal(200);
                    done();
                });
            });
        });

        describe('can override the server notFound route', function () {

            var server = new Hapi.Connection(0);
            server.route({ method: 'GET', path: '/exists/{p*}', handler: function (request, reply) { reply('OK'); } });
            server.route({
                method: '*', path: '/{p*}', handler: function (request, reply) {

                    reply(Hapi.error.notFound('These these are not the pages you are looking for.'));
                }
            });

            it('returns custom response when requesting a route that does not exist', function (done) {

                server.inject({ method: 'GET', url: '/page' }, function (res) {

                    expect(res.statusCode).to.equal(404);
                    expect(res.result.message).to.equal('These these are not the pages you are looking for.');
                    done();
                });
            });

            it('returns 200 when making a request to an existing route', function (done) {

                server.inject({ method: 'GET', url: '/exists/ok' }, function (res) {

                    expect(res.statusCode).to.equal(200);
                    done();
                });
            });
        });
    });
});
