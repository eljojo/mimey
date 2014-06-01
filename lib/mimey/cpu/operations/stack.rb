module Mimey
  class CPU
    # PUSHBC, PUSHDE, PUSHHL, PUSHAF
    # push_bc, push_de, push_hl, push_af
    [[:b, :c], [:d, :e], [:h, :l], [:a, :f]].each do |reg|
      r1, r2 = reg
      method_name = "push_#{r1}#{r2}"
      define_method(method_name) do
        @sp -= 1
        @mmu[@sp] = instance_variable_get "@#{r1}"
        @sp -= 1
        @mmu[@sp] = instance_variable_get "@#{r2}"

        @r_m = 3
        @r_t = 12
      end
    end

    # POPBC, POPDE, POPHL, POPAF
    # pop_bc, pop_de, pop_hl, pop_af
    [[:b, :c], [:d, :e], [:h, :l], [:a, :f]].each do |reg|
      r1, r2 = reg
      method_name = "pop_#{r1}#{r2}"
      define_method(method_name) do
        instance_variable_set "@#{r2}", @mmu[@sp]
        @sp += 1
        instance_variable_set "@#{r1}", @mmu[@sp]
        @sp += 1

        @r_m = 3
        @r_t = 12
      end
    end
  end
end
