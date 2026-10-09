package sg.nus.carelink.identity.controller.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** The same length rule as family sign-up; 72 bytes is BCrypt's cap, past which it ignores the rest. */
public record ChooseOwnPasswordRequest(
		@NotBlank(message = "Password must not be blank")
		@Size(min = 8, max = 72, message = "Use 8 to 72 characters") String newPassword) {
}
