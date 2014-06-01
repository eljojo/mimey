require 'spec_helper'

describe Mimey::CPU do
  subject(:cpu) { Mimey::CPU.new }

  describe 'NOP operation' do
    before { cpu.load_with(0x00).step }

    [:a, :f, :b, :c, :d, :e, :h, :l, :sp].each do |r|
      its(r) { should == 0 }
    end

    its(:pc) { should == 0x0001 }
    its(:clock_m) { should == 1 }
  end
end
