require 'mimey/cpu/operations'

module Mimey
  class Emulator
    attr_accessor :debug_mode, :step_by_step, :step_counter

    def initialize(cpu_options = {})
      cpu_options = CPU::DEFAULTS.merge(cpu_options)
      @cpu = CPU.new(cpu_options)
      @gpu = GPU.new(LcdScreen.new)
      @cpu.mmu.gpu = @gpu
      @gpu.cpu = @cpu
    end

    def load_rom(path)
      rom = File.binread(path)
      @cpu.load_with(*rom.unpack("C*"))
    end

    def run
      reset
      loop do
        step
        gets if step_by_step
      end
    end

    def reset
      @cpu.reset
    end

    def step
      @cpu.step
      @cpu.debug if !!debug_mode
      @gpu.step

      if step_counter then
        step = @cpu.step_counter_step
        step.gpu_r = @gpu.step_counter_registers
        step_counter << step
      end
    end

    def frame
      fclk = @cpu.clock_m + 17556
      begin
        step
      end while @cpu.clock_m < fclk
    end

    def debug
      @cpu.debug
    end

    def run_test(enum)
      enum.each do
        step
      end
    end
  end
end
