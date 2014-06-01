module Mimey
  # his class represents the Game Boy MMU
  class GPU
    def initialize(screen)
      @screen = screen
      @vram = Array.new(8192, 0x00)

      reset_tileset
      @mmu = nil
      @bg_map = false
      @line = nil
      @scy = nil
      @scx = nil
      @bgtile = nil
    end

    def []=(i, n)
      @vram[i] = n
    end

    def step
      # TODO: This is not correct, we are using no timing
      # that probably has to be fixed in the CPU first so we can use it here
      @screen.render
    end

    def reset_tileset
      @tileset = 384.times.map do
        # each tile is 8x8
        8.times.map do
          [0,0,0,0,0,0,0,0]
        end
      end
    end

    def update_tile(addr, val)
      # Get the "base address" for this tile row
      addr &= 0x1FFE

      # Work out which tile and row was updated
      tile = (addr >> 4) & 511
      y = (addr >> 1) & 7

      8.times do |x|
        # Find bit index for this pixel
        sx = 1 << (7-x)

        # Update tile set
        @tileset[tile][y][x] =
            ((@vram[addr] & sx)   ? 1 : 0) +
            ((@vram[addr+1] & sx) ? 2 : 0)
      end
    end

    def renderscan
      # VRAM offset for the tile map
      mapoffs = @bgmap ? 0x1C00 : 0x1800

      # Which line of tiles to use in the map
      mapoffs += ((@line + @scy) & 255) >> 3

      # Which tile to start with in the map line
      lineoffs = (@scx >> 3)

      # Which line of pixels to use in the tiles
      y = (@line + @scy) & 7

      # Where in the tileline to start
      x = @scx & 7

      # Where to render on the canvas
      canvasoffs = @line * 160 * 4

      # Read tile index from the background map
      colour = nil
      tile = @vram[mapoffs + lineoffs]

      # If the tile data set in use is #1, the
      # indices are signed; calculate a real tile offset
      if @bgtile == 1 && tile < 128 then
        tile += 256
      end

      160.times do |i|
        # Re-map the tile pixel through the palette
        colour = @pal[@tileset[tile][y][x]]

        # Plot the pixel to canvas
        # GPU._scrn.data[canvasoffs+0] = colour[0];
        # GPU._scrn.data[canvasoffs+1] = colour[1];
        # GPU._scrn.data[canvasoffs+2] = colour[2];
        # GPU._scrn.data[canvasoffs+3] = colour[3];
        canvasoffs += 4

        # When this tile ends, read another
        x++
        if x == 8 then
          x = 0
          lineoffs = (lineoffs + 1) & 31
          tile = @vram[mapoffs + lineoffs]
          if @bgtile == 1 && tile < 128 then
            tile += 256
          end
        end
      end
    end

  end
end
