module Mimey
  class StepCounter
    attr_reader :steps

    def initialize
      @steps = []
    end

    def <<(step)
      @steps << step
    end

    def compare_with(other_step_counter)
      steps.each_with_index.find do |step, index|
        other_step_counter.steps[index] != step
      end
    end

    class Step < Struct.new(:id, :op, :r, :gpu_r)
      def eql?(other_step)
        self == other_step
      end

      def ==(other_step)
        self.id == other_step.id && self.op == other_step.op && \
        self.r == other_step.r && self.gpu_r == other_step.gpu_r
      end

      def to_s
        regs = %w{pc a b c d e f}.map do |reg|
                "#{reg}: #{r.send(reg)}"
              end
        gpu_regs = %w{intfired line raster mode modeclocks}.map do |reg|
                "#{reg}: #{gpu_r.send(reg)}"
              end

        op_name = CPU::OPERATIONS[op].to_s
        op_name << "\t" if op_name.length <= 7

        res = ["step #{id}", "op 0x#{op.to_s(16).upcase}", op_name] + regs + gpu_regs
        res.join("\t")
      end
    end

    class Registers < Struct.new(:a, :b, :c, :d, :e, :f, :h, :l, :pc)
      def eql?(other_r)
        self == other_r
      end

      def ==(other_r)
        self.a == other_r.a && \
        self.b == other_r.b && \
        self.c == other_r.c && \
        self.d == other_r.d && \
        self.e == other_r.e && \
        self.f == other_r.f && \
        # self.h == other_r.h && \
        # self.l == other_r.l && \
        self.pc == other_r.pc
      end
    end

    class GPURegisters < Struct.new(:intfired, :line, :raster, :mode, :modeclocks)
      def eql?(other_r)
        self == other_r
      end

      def ==(other_r)
        self.intfired == other_r.intfired && \
        self.line == other_r.line && \
        self.raster == other_r.raster && \
        self.mode == other_r.mode && \
        self.modeclocks == other_r.modeclocks
      end
    end
  end
end
