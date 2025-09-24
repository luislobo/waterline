var assert = require('assert');
var Waterline = require('../../../../lib/waterline');

describe('Collection Query ::', function() {
  describe('specific populated associations ::', function() {
    var waterline;
    var Car;

    before(function(done) {
      waterline = new Waterline();
      var collections = {};

      collections.user = Waterline.Model.extend({
        identity: 'user',
        datastore: 'foo',
        primaryKey: 'id',
        attributes: {
          id: {
            type: 'number'
          },
          car: {
            model: 'car'
          },
          name: {
            columnName: 'my_name',
            type: 'string'
          }
        }
      });

      collections.ticket = Waterline.Model.extend({
        identity: 'ticket',
        datastore: 'foo',
        primaryKey: 'id',
        attributes: {
          id: {
            type: 'number'
          },
          reason: {
            columnName: 'reason',
            type: 'string'
          },
          car: {
            model: 'car'
          }
        }
      });

      collections.car = Waterline.Model.extend({
        identity: 'car',
        datastore: 'foo',
        primaryKey: 'id',
        attributes: {
          id: {
            type: 'number'
          },
          driver: {
            model: 'user',
            columnName: 'foobar'
          },
          tickets: {
            collection: 'ticket',
            via: 'car'
          }
        }
      });

      waterline.registerModel(collections.user);
      waterline.registerModel(collections.car);
      waterline.registerModel(collections.ticket);

      var adapterDef = {
        identity: 'foo',
        find: function(con, query, cb) {
          if (query.using === 'user') {
            return cb(null, [{ id: 1, car: 1, name: 'John Doe' }]);
          }

          if (query.using === 'car') {
            return cb(null, [{ id: 1, foobar: 1, tickets: [1, 2]}]);
          }

          if (query.using === 'ticket') {
            return cb(null, [
              { id: 1, reason: 'red light', car: 1 },
              { id: 2, reason: 'Parking in a disabled space', car: 1 }
            ]);
          }

          return cb();
        }
      };

      var connections = {
        foo: {
          adapter: 'foobar'
        }
      };

      waterline.initialize({ adapters: { foobar: adapterDef }, datastores: connections }, function(err, orm) {
        if (err) {
          return done(err);
        }

        Car = orm.collections.car;
        return done();
      });
    });

    after(function(done) {
      if (!waterline) {
        return done();
      }

      waterline.teardown(function() {
        waterline = null;
        return done();
      });
    });

    it('should populate all related collections', function(done) {
      Car.find()
      .populate('driver')
      .populate('tickets')
      .exec(function(err, car) {
        if (err) {
          return done(err);
        }

        assert(car[0].driver);
        assert(car[0].driver.name);
        assert(car[0].tickets);
        assert(car[0].tickets[0].car);
        assert(car[0].tickets[1].car);
        return done();
      });
    });

    it('should allow populate with select subcriteria for singular associations', function(done) {
      Car.find()
      .populate('driver', {
        select: ['name']
      })
      .exec(function(err, car) {
        if (err) {
          return done(err);
        }

        assert(car[0].driver);
        assert.strictEqual(typeof car[0].driver.name, 'string');
        assert.strictEqual(typeof car[0].driver.id, 'number');
        assert.strictEqual(Object.keys(car[0].driver).length, 2);
        return done();
      });
    });

    it('should allow populate with omit subcriteria for singular associations', function(done) {
      Car.find()
      .populate('driver', {
        omit: ['car']
      })
      .exec(function(err, car) {
        if (err) {
          return done(err);
        }

        assert(car[0].driver);
        assert.strictEqual(typeof car[0].driver.name, 'string');
        assert.strictEqual(typeof car[0].driver.id, 'number');
        assert.strictEqual(car[0].driver.car, undefined);
        return done();
      });
    });

    it('should allow populate with empty object (converts to true)', function(done) {
      Car.find()
      .populate('driver', {})
      .exec(function(err, car) {
        if (err) {
          return done(err);
        }

        assert(car[0].driver);
        assert.strictEqual(typeof car[0].driver.name, 'string');
        return done();
      });
    });

    it('should throw error when both select and omit are provided together', function(done) {
      Car.find()
      .populate('driver', {
        select: ['name'],
        omit: ['id']
      })
      .exec(function(err) {
        assert(err);
        assert.equal(err.code, 'E_INVALID_POPULATES');
        assert(err.message.indexOf('providing both `select` AND `omit`') > -1);
        return done();
      });
    });
  });

  describe('populate subcriteria validation errors ::', function() {
    var waterline;
    var Holder;

    before(function(done) {
      waterline = new Waterline();
      var collections = {};

      collections.pet = Waterline.Model.extend({
        identity: 'pet',
        datastore: 'foo',
        primaryKey: 'id',
        attributes: {
          id: {
            type: 'number'
          },
          name: {
            type: 'string'
          },
          owner: {
            model: 'buddy'
          }
        }
      });

      collections.buddy = Waterline.Model.extend({
        identity: 'buddy',
        datastore: 'foo',
        primaryKey: 'id',
        attributes: {
          id: {
            type: 'number'
          },
          name: {
            type: 'string'
          },
          nickname: {
            type: 'string'
          },
          pets: {
            collection: 'pet',
            via: 'owner'
          }
        }
      });

      collections.holder = Waterline.Model.extend({
        identity: 'holder',
        datastore: 'foo',
        primaryKey: 'id',
        attributes: {
          id: {
            type: 'number'
          },
          buddy: {
            model: 'buddy'
          }
        }
      });

      waterline.registerModel(collections.holder);
      waterline.registerModel(collections.buddy);
      waterline.registerModel(collections.pet);

      var adapterDef = {
        identity: 'foo',
        find: function(con, query, cb) {
          if (query.using === 'holder') {
            return cb(null, [{ id: 1, buddy: 1 }]);
          }

          if (query.using === 'buddy') {
            return cb(null, [{ id: 1, name: 'Buddy One', nickname: 'B', pets: [] }]);
          }

          if (query.using === 'pet') {
            return cb(null, []);
          }

          return cb();
        }
      };

      var connections = {
        foo: {
          adapter: 'foobar'
        }
      };

      waterline.initialize({ adapters: { foobar: adapterDef }, datastores: connections }, function(err, orm) {
        if (err) {
          return done(err);
        }

        Holder = orm.collections.holder;
        return done();
      });
    });

    after(function(done) {
      if (!waterline) {
        return done();
      }

      waterline.teardown(function() {
        waterline = null;
        return done();
      });
    });

    it('should error when populate select clause is not an array', function(done) {
      Holder.find()
      .populate('buddy', {
        select: 'name'
      })
      .exec(function(err) {
        assert(err);
        assert.equal(err.code, 'E_INVALID_POPULATES');
        assert(err.message.indexOf('invalid `select` clause') > -1);
        return done();
      });
    });

    it('should error when populate select clause contains a non-string', function(done) {
      Holder.find()
      .populate('buddy', {
        select: ['name', 5]
      })
      .exec(function(err) {
        assert(err);
        assert.equal(err.code, 'E_INVALID_POPULATES');
        assert(err.message.indexOf('not a string') > -1);
        return done();
      });
    });

    it('should error when populate select clause references an unknown attribute', function(done) {
      Holder.find()
      .populate('buddy', {
        select: ['name', 'age']
      })
      .exec(function(err) {
        assert(err);
        assert.equal(err.code, 'E_INVALID_POPULATES');
        assert(err.message.indexOf('not a recognized attribute') > -1);
        return done();
      });
    });

    it('should error when populate select clause references a collection attribute', function(done) {
      Holder.find()
      .populate('buddy', {
        select: ['name', 'pets']
      })
      .exec(function(err) {
        assert(err);
        assert.equal(err.code, 'E_INVALID_POPULATES');
        assert(err.message.indexOf('plural ("collection") association') > -1);
        return done();
      });
    });

    it('should error when populate omit clause is not an array', function(done) {
      Holder.find()
      .populate('buddy', {
        omit: 'nickname'
      })
      .exec(function(err) {
        assert(err);
        assert.equal(err.code, 'E_INVALID_POPULATES');
        assert(err.message.indexOf('invalid `omit` clause') > -1);
        return done();
      });
    });

    it('should error when populate omit clause contains a non-string', function(done) {
      Holder.find()
      .populate('buddy', {
        omit: [3]
      })
      .exec(function(err) {
        assert(err);
        assert.equal(err.code, 'E_INVALID_POPULATES');
        assert(err.message.indexOf('not a string') > -1);
        return done();
      });
    });

    it('should error when populate omit clause references an unknown attribute', function(done) {
      Holder.find()
      .populate('buddy', {
        omit: ['age']
      })
      .exec(function(err) {
        assert(err);
        assert.equal(err.code, 'E_INVALID_POPULATES');
        assert(err.message.indexOf('not a recognized attribute') > -1);
        return done();
      });
    });

    it('should error when populate omit clause references the associated model primary key', function(done) {
      Holder.find()
      .populate('buddy', {
        omit: ['id']
      })
      .exec(function(err) {
        assert(err);
        assert.equal(err.code, 'E_INVALID_POPULATES');
        assert(err.message.indexOf('primary key') > -1);
        return done();
      });
    });

    it('should error when populate omit clause references a collection attribute', function(done) {
      Holder.find()
      .populate('buddy', {
        omit: ['pets']
      })
      .exec(function(err) {
        assert(err);
        assert.equal(err.code, 'E_INVALID_POPULATES');
        assert(err.message.indexOf('plural ("collection") association') > -1);
        return done();
      });
    });
  });

  describe('populate subcriteria validation with schema false associated model ::', function() {
    var waterline;
    var Haunter;

    before(function(done) {
      waterline = new Waterline();
      var collections = {};

      collections.ghost = Waterline.Model.extend({
        identity: 'ghost',
        datastore: 'foo',
        primaryKey: 'id',
        schema: false,
        attributes: {
          id: {
            type: 'number'
          },
          name: {
            type: 'string'
          }
        }
      });

      collections.haunter = Waterline.Model.extend({
        identity: 'haunter',
        datastore: 'foo',
        primaryKey: 'id',
        attributes: {
          id: {
            type: 'number'
          },
          friend: {
            model: 'ghost'
          }
        }
      });

      waterline.registerModel(collections.haunter);
      waterline.registerModel(collections.ghost);

      var adapterDef = {
        identity: 'foo',
        find: function(con, query, cb) {
          if (query.using === 'haunter') {
            return cb(null, [{ id: 1, friend: 1 }]);
          }

          if (query.using === 'ghost') {
            return cb(null, [{ id: 1, name: 'Boo' }]);
          }

          return cb();
        }
      };

      var connections = {
        foo: {
          adapter: 'foobar'
        }
      };

      waterline.initialize({ adapters: { foobar: adapterDef }, datastores: connections }, function(err, orm) {
        if (err) {
          return done(err);
        }

        Haunter = orm.collections.haunter;
        return done();
      });
    });

    after(function(done) {
      if (!waterline) {
        return done();
      }

      waterline.teardown(function() {
        waterline = null;
        return done();
      });
    });

    it('should error when populate select clause is used with schema false associated model', function(done) {
      Haunter.find()
      .populate('friend', {
        select: ['name']
      })
      .exec(function(err) {
        assert(err);
        assert.equal(err.code, 'E_INVALID_POPULATES');
        assert(err.message.indexOf('declared `schema: false`') > -1);
        return done();
      });
    });

    it('should error when populate omit clause is used with schema false associated model', function(done) {
      Haunter.find()
      .populate('friend', {
        omit: ['name']
      })
      .exec(function(err) {
        assert(err);
        assert.equal(err.code, 'E_INVALID_POPULATES');
        assert(err.message.indexOf('declared `schema: false`') > -1);
        return done();
      });
    });
  });
});
