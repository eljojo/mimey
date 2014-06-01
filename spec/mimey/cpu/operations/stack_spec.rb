require 'spec_helper'

describe Mimey::CPU do
  subject(:cpu) { Mimey::CPU.new(options) }
  let(:options) { Mimey::CPU::DEFAULTS }

  pending "implements PUSH_ methods correctly"
  pending "implements POP_ methods correctly"
end
