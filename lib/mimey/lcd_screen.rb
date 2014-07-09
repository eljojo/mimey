module Mimey
  # his class represents the Game Boy MMU
  class LcdScreen
    WIDTH = 160
    HEIGHT = 10 #144
    COLORS = [107, 100, 47, 40] # lightest to darkest
    COLOR_NAMES = [:white, :light_gray, :dark_gray, :black]

    def initialize
      @screen = (WIDTH * HEIGHT).times.map { 0 }
    end

    def render
      @screen.each_with_index do |color, pos|
        print_pixel(color)
        # print "."
        print "\n" if (pos + 1) % WIDTH == 0
      end
    end

    def []=(coords, color)
      return unless color
      color_code = COLORS[COLOR_NAMES.index(color)]
      x, y = coords
      if x < WIDTH and y < HEIGHT
        @screen[y * WIDTH + x] = color_code
      end
    end

    private
    # https://github.com/fazibear/colorize/blob/master/lib/colorize.rb
    # http://misc.flogisoft.com/bash/tip_colors_and_formatting
    def print_pixel(color)
      code = COLORS[color]
      print "\e[49m\e[#{code}m \e[49m"
    end
  end
end
