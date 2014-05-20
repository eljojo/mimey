module Mimey
  # his class represents the Game Boy MMU
  class GPU
    def initialize(screen)
      @screen = screen
    end

    def step
      # TODO: This is not correct, we are using no timing
      # that probably has to be fixed in the CPU first so we can use it here
      @screen.render
    end
  end
end
