var Game = new Vue({
    el: '#mainVue',
    data: {
        tileDimension: 124,
        tilePosition: 121,
        size: 4,
        startTiles: 2,
        tiles: [],
        grid: [],
        score: 0,
        bestScore: gameStorage.fetch('bestScore')
    },

    created: function() {
        // this.initArrayGrid(this.size);
        this.getWindowSize();
    },

    ready: function() {
        var data = gameStorage.fetch('vue2048');

        if (data === 0) {
            this.init();
        } else {
            this.continueGame(data);
        }

        this.$watch('tiles', function(tiles) {
            gameStorage.save('vue2048', tiles);
        });

    },
    //Can go to templates
    computed: {
        findDimension: function() {
            return this.grid.length * this.tileDimension;
        },

        allDone: {
            $get: function() {
                return this.remaining === 0;
            },
            $set: function(value) {
                this.todos.forEach(function(todo) {
                    todo.completed = value;
                });
            }
        }
    },

    components: {
        grid: {
            template:  '<div v-repeat="grid" class="grid-row">\
                            <div v-repeat="grid" class="grid-cell"></div>\
                        </div>',
            replace: false
        },

        tile: {
            //Better to use template, todo delete tile position
            template: '<div style="{{calculateStyle}}" class="tile tile-{{value}} tile-position-{{x+1}}-{{y+1}} tile-new">\
                        <div class="tile-inner">{{value}}</div>\
                    </div>',

            replace: true,

            computed: {
                calculateStyle: function() {
                    var tilePosition = this.$parent.tilePosition;
                    var x = this.x * tilePosition;
                    var y = this.y * tilePosition;

                    return '-webkit-transform: translate(' + x + 'px, ' + y + 'px);' +
                        '-moz-transform: translate(0px, 0px);' +
                        'transform: translate(0px, 0px);';
                }
            }
        }
    },


    methods: {

        init: function() {
            // debugger;
            var startTiles = this.startTiles;

            this.initArrayGrid(this.size);
            this.clearMessage();

            this.tiles = [];
            this.updateScore(0);

            for (var i = 0; i < startTiles; i++) {
                this.addRandomTile();
            }
        },

        continueGame: function(data) {
            this.initArrayGrid(this.size);

            var arr = this.grid;
            this.tiles = data;
            this.score = gameStorage.fetch('score');

            data.forEach(function(item) {
                arr[item.x][item.y] = 1;
            })
        },

        gameOver: function() {
            this.message();
        },

        initArrayGrid: function(size) {
            var arr = [];

            for (var x = 0; x < size; x++) {
                arr[x] = [];
                for (var y = 0; y < size; y++) {
                    arr[x][y] = 0;
                }
            }

            this.grid = arr;
        },

        changesTilesSize: function(e) {
            this.size = parseInt(e.target.value);
            this.init();
        },

        addRandomTile: function() {
    
            if (this.availableCells().length > 0) {
                var value = Math.random() < 0.9 ? 2 : 4,
                    randomCell = this.randomAvailableCell();


                this.tiles.$set(this.tiles.length, {
                    x: randomCell.x,
                    y: randomCell.y,
                    value: value
                });


                this.grid[randomCell.x][randomCell.y] = 1;

            }

        },

        // Find the first available random position
        randomAvailableCell: function() {
            var cells = this.availableCells();

            if (cells.length) {
                return cells[Math.floor(Math.random() * cells.length)];
            }
        },

        availableCells: function() {
            var cells = [],
                size = this.size,
                grid = this.grid;

            for (var x = 0; x < size; x++) {
                for (var y = 0; y < size; y++) {
                    if (!grid[x][y]) {
                        cells.push({
                            x: x,
                            y: y
                        });
                    }
                }
            }

            return cells;
        },

        getVector: function(direction) {
            var map = {
                0: {
                    x: 0,
                    y: -1
                }, // Up
                1: {
                    x: 1,
                    y: 0
                }, // Right
                2: {
                    x: 0,
                    y: 1
                }, // Down
                3: {
                    x: -1,
                    y: 0
                } // Left
            };

            return map[direction];
        },

        findFarthestPosition: function(cell, vector) {
            var previous;

            do {
                previous = cell;
                cell = {
                    x: previous.x + vector.x,
                    y: previous.y + vector.y
                };

            } while (this.withinBounds(cell) && !this.grid[cell.x][cell.y]);

            return {
                farthest: previous,
                next: cell // Used to check if a merge is required
            };
        },

        findTile: function(position) {

            if (position.x === -1 || position.y === -1)
                return null;
            else {
                var tiles = this.tiles;

                return tiles.filter(function(item, index) {
                    return item.x === position.x && item.y === position.y;
                })[0];
            }

        },

        moveTile: function(tile, position) {

            if (tile.x === position.x && tile.y === position.y) {
                return false;
            } else {
                this.grid[tile.x][tile.y] = 0;
                this.grid[position.x][position.y] = 1;

                tile.x = position.x;
                tile.y = position.y;

                return true;
            }

        },

        mergeTiles: function(curr, next, position) {

            next.value = next.value * 2;
            var tiles = this.tiles;

            //Better Way to find index of data
            for (var key in tiles) {
                if (tiles[key].x === curr.x && tiles[key].y === curr.y) {
                    break;
                }
            }

            this.grid[curr.x][curr.y] = 0;
            this.tiles.$remove(parseInt(key));

            // Update the score
            this.updateScore(next.value);
        },

        move: function(direction) {

            var vector = this.getVector(direction);
            var traversals = this.buildTraversals(vector);
            var moved = false;
            var self = this;
            var grid = self.grid;
            var positions;
            var next;
            var tile;


            traversals.x.forEach(function(x) {
                traversals.y.forEach(function(y) {
                    // console.log(x, y);
                    if (grid[x][y]) {
                        var tile = self.findTile({
                            x: x,
                            y: y
                        });
                        var positions = self.findFarthestPosition({
                            x: x,
                            y: y
                        }, vector);
                        //console.log(positions);
                        var next = self.findTile(positions.next);

                        //console.log(next); 
                        // Only one merger per row traversal?
                        if (next && next.value === tile.value) {

                            self.mergeTiles(tile, next, positions.next);


                        } else {
                            moved = self.moveTile(tile, positions.farthest);
                        }

                    }

                });
            });

            if (moved) {
                this.addRandomTile();

                if(grid.toString().indexOf('0') === -1){
                    if(!this.tileMatchesAvailable()){
                        this.gameOver();
                    }

                }

            }

        },

        tileMatchesAvailable: function() {

            var size = this.size;
            var grid = this.grid;
            var tiles = this.tiles;
            var tile;

            for (var x = 0; x < size; x++) {
                for (var y = 0; y < size; y++) {
                    tile = grid[x][y];

                    if (tile) {
                        for (var direction = 0; direction < 4; direction++) {
                            var vector = this.getVector(direction);
                            var cell = {
                                x: x + vector.x,
                                y: y + vector.y
                            },
                                other;

                            if (cell.x >= 0 && cell.x < size && cell.y >= 0 && cell.y < size){
                                other = grid[cell.x][cell.y];
                            } else {
                                continue;
                            }

                            if (other && this.findTile(cell).value === this.findTile({
                                x: x,
                                y: y
                            }).value) {
                                return true; // These two tiles can be merged
                            }
                        }
                    }
                }
            }

            return false;
        },

        withinBounds: function(position) {
            var size = this.size;

            return position.x >= 0 && position.x < size && position.y >= 0 && position.y < size;
        },

        buildTraversals: function(vector) {
            var traversals = {
                x: [],
                y: []
            },
                size = this.size;

            for (var pos = 0; pos < size; pos++) {
                traversals.x.push(pos);
                traversals.y.push(pos);
            }

            // Always traverse from the farthest cell in the chosen direction
            if (vector.x === 1) traversals.x = traversals.x.reverse();
            if (vector.y === 1) traversals.y = traversals.y.reverse();

            return traversals;
        },

        updateScore: function(score) {
            var scoreContainer = document.getElementsByClassName('score-container')[0];

            //On init
            if (score === 0) {
                this.score = 0;
                gameStorage.save('score', 0);

                return false;
            }

            this.score += score;
            gameStorage.save('score', this.score);

            if(this.score > this.bestScore) {
                this.bestScore = this.score;
                gameStorage.save('bestScore', this.bestScore);
            }

            // The mighty 2048 tile
            if (score === 2048)
                this.message(true);

            var addition = document.createElement("div");
            addition.classList.add("score-addition");
            addition.textContent = "+" + score;
            scoreContainer.appendChild(addition);

        },

        message: function(won) {
            var type = won ? "game-won" : "game-over";
            var message = won ? "You win!" : "Game over!";
            var messageContainer = document.querySelector(".game-message");

            messageContainer.classList.add(type);
            messageContainer.getElementsByTagName("p")[0].textContent = message;
        },

        clearMessage: function() {
            messageContainer = document.querySelector(".game-message");

            messageContainer.classList.remove("game-won");
            messageContainer.classList.remove("game-over");
        },

        clearContainer: function(container) {
            while (container.firstChild) {
                container.removeChild(container.firstChild);
            }
        },

        getWindowSize: function() {
            var w = window,
                d = document,
                e = d.documentElement,
                g = d.getElementsByTagName('body')[0],
                x = w.innerWidth || e.clientWidth || g.clientWidth,
                y = w.innerHeight || e.clientHeight || g.clientHeight;

            if (x < 520) {
                this.tileDimension = 69.5;
                this.tilePosition = 67;
            } else {
                this.tileDimension = 124;
                this.tilePosition = 121;

            }
        }

    }
});



var Keys = new KeyboardInputManager();


Keys.on('move', function(direction) {
    Game.move(direction);
});


window.onresize = function(event) {
    Game.getWindowSize();
};

// Keys.on('restart', function() {
//     Game.init();
// });


// Vue.directive('for', {
//     bind: function () {
//         // this.el.style.color = '#fff';
//         // this.el.style.backgroundColor = this.arg;
//         console.log(this);
//     },
//     update: function (value) {
//         // this.el.innerHTML =
//         //     'argument - ' + this.arg + '<br>' +
//         //     'key - ' + this.key + '<br>' +
//         //     'value - ' + value
//     }
// });

// Vue.component('grid', {
//     template: '#grid-template',
//     replace: false,
//     created: function() {
//         console.log('componed created');
//     },

//     ready: function() {
//         console.log('component ready');
//     },
//     methods: {

//     }
// });